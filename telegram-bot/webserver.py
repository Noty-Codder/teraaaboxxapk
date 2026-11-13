"""
Built-in web server: Watch Now / Download Now pages.

Why: the TeraBox API returns links that contain your API address.  Putting those
links in Telegram buttons would reveal your API to everybody.  Instead the bot
stores the real links in memory under a random token and gives users only:

    BASE_URL/watch/<token>     professional player page
    BASE_URL/dl/<token>        download (streamed through this server)
    BASE_URL/stream/<token>    video stream used by the player (Range supported)

The real API / CDN address never leaves this server (PROXY_MODE=stream).
"""
import asyncio
import base64
import hashlib
import hmac
import html
import logging
import re
import secrets
import time
from urllib.parse import quote, urljoin, urlparse

import aiohttp
from aiohttp import web

from config import (
    BASE_URL, PORT, WEB_LINK_TTL_MINUTES, PROXY_MODE, WEB_SECRET,
    BRAND_NAME, BRAND_TAGLINE, MAX_DOWNLOAD_GB,
)
from utils import fmt_size, scrub

logger = logging.getLogger("BetaBotHub.Web")

UP_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    "Referer": "https://www.terabox.com/",
    "Accept": "*/*",
}
PASS_HEADERS = ("Content-Type", "Content-Length", "Content-Range", "Accept-Ranges", "ETag", "Last-Modified")

_LINKS: dict = {}          # token -> info dict
_SESSION: aiohttp.ClientSession | None = None


# --------------------------------------------------------------------- store
def web_enabled() -> bool:
    return bool(BASE_URL)


def create_links(info: dict, user_id: int = 0) -> dict:
    """Store a resolved file and return {'watch': url, 'download': url} (public, API-free)."""
    token = secrets.token_urlsafe(14)
    _LINKS[token] = {
        "title": info.get("title") or "video",
        "size": info.get("size") or "N/A",
        "size_bytes": info.get("size_bytes") or 0,
        "download_url": info.get("download_url"),
        "stream_url": info.get("stream_url") or info.get("download_url"),
        "thumb": info.get("thumbnail_url") if isinstance(info.get("thumbnail_url"), str) else None,
        "uid": user_id,
        "exp": time.time() + WEB_LINK_TTL_MINUTES * 60,
    }
    return {"watch": f"{BASE_URL}/watch/{token}", "download": f"{BASE_URL}/dl/{token}"}


def _get(token: str):
    rec = _LINKS.get(token)
    if not rec:
        return None
    if rec["exp"] < time.time():
        _LINKS.pop(token, None)
        return None
    return rec


async def _cleanup_loop():
    while True:
        await asyncio.sleep(300)
        now = time.time()
        for t in [t for t, r in _LINKS.items() if r["exp"] < now]:
            _LINKS.pop(t, None)


# --------------------------------------------------------------------- helpers
def _sig(url: str) -> str:
    return hmac.new(WEB_SECRET.encode(), url.encode(), hashlib.sha256).hexdigest()[:20]


def _b64(url: str) -> str:
    return base64.urlsafe_b64encode(url.encode()).decode().rstrip("=")


def _unb64(s: str) -> str:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4)).decode()


def _is_hls(url: str) -> bool:
    return ".m3u8" in (url or "").lower().split("?")[0] or "m3u8" in (url or "").lower()


def _content_disposition(name: str, inline: bool) -> str:
    safe = re.sub(r'[\\/:*?"<>|\r\n]+', "_", name) or "video.mp4"
    ascii_name = safe.encode("ascii", "ignore").decode() or "video.mp4"
    kind = "inline" if inline else "attachment"
    return f"{kind}; filename=\"{ascii_name}\"; filename*=UTF-8''{quote(safe)}"


def _error_page(title: str, msg: str, status: int = 404) -> web.Response:
    body = f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(title)} • {html.escape(BRAND_NAME)}</title>
<style>body{{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0f19;color:#e5e7eb;
font-family:system-ui,Segoe UI,Roboto,sans-serif}}.c{{text-align:center;padding:32px;max-width:420px}}
h1{{font-size:22px;margin:0 0 8px}}p{{color:#94a3b8;line-height:1.6}}.b{{color:#06b6d4;font-weight:700;letter-spacing:.5px}}</style>
</head><body><div class="c"><div class="b">⚡ {html.escape(BRAND_NAME.upper())}</div>
<h1>{html.escape(title)}</h1><p>{html.escape(msg)}</p></div></body></html>"""
    return web.Response(text=body, status=status, content_type="text/html")


# --------------------------------------------------------------------- pages
WATCH_TEMPLATE = """<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<title>__TITLE__ • __BRAND__</title>
<style>
:root{--bg:#0b0f19;--card:#111827;--line:#1f2937;--txt:#e5e7eb;--mut:#94a3b8;--acc:#06b6d4;--acc2:#3b82f6}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(1200px 600px at 50% -200px,#0e2a3a 0,var(--bg) 60%);
color:var(--txt);font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;min-height:100vh}
header{display:flex;align-items:center;gap:10px;padding:14px 18px;border-bottom:1px solid var(--line);
backdrop-filter:blur(6px);position:sticky;top:0;background:rgba(11,15,25,.8);z-index:5}
.logo{width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,var(--acc),var(--acc2));
display:grid;place-items:center;font-size:18px}.brand b{display:block;letter-spacing:.6px}
.brand span{font-size:12px;color:var(--mut)}
main{max-width:980px;margin:0 auto;padding:18px}
.player{background:#000;border-radius:16px;overflow:hidden;border:1px solid var(--line);box-shadow:0 20px 60px rgba(6,182,212,.08)}
video{width:100%;max-height:70vh;display:block;background:#000}
.card{margin-top:16px;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:18px}
h1{font-size:18px;line-height:1.4;margin:0 0 10px;word-break:break-word}
.meta{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px}
.chip{font-size:12px;padding:5px 10px;border-radius:999px;border:1px solid var(--line);color:var(--mut);background:#0d1424}
.btns{display:flex;flex-wrap:wrap;gap:10px}
a.btn{flex:1 1 180px;text-align:center;text-decoration:none;padding:13px 16px;border-radius:12px;font-weight:700;color:#fff;
background:linear-gradient(135deg,var(--acc),var(--acc2));transition:transform .15s,opacity .15s}
a.btn:hover{transform:translateY(-1px);opacity:.92}a.btn.alt{background:#0d1424;border:1px solid var(--line);color:var(--txt)}
.note{margin-top:14px;font-size:12px;color:var(--mut);line-height:1.6}
footer{text-align:center;color:var(--mut);font-size:12px;padding:22px}
#err{display:none;padding:14px;color:#fca5a5;font-size:13px}
</style></head><body>
<header><div class="logo">⚡</div><div class="brand"><b>__BRAND_UP__</b><span>__TAGLINE__</span></div></header>
<main>
<div class="player">
<video id="v" controls playsinline preload="metadata" __POSTER__></video>
<div id="err">Playback problem? Use the <b>Download Now</b> button below and play the file in your player.</div>
</div>
<div class="card">
<h1>__TITLE__</h1>
<div class="meta"><span class="chip">📦 __SIZE__</span><span class="chip">🎬 Video</span><span class="chip">🔒 Secure link</span></div>
<div class="btns"><a class="btn" href="__DL__">⬇️ Download Now</a>
<a class="btn alt" href="__BOT__">🤖 Open __BRAND__ Bot</a></div>
<div class="note">This link is private and expires automatically. Files above __LIMIT__ GB are not sent in Telegram chat — use the buttons here.</div>
</div></main>
<footer>© __BRAND__ • Fast &amp; secure TeraBox delivery</footer>
<script src="https://cdn.jsdelivr.net/npm/hls.js@1.5.15/dist/hls.min.js"></script>
<script>
(function(){
  var v=document.getElementById('v'),src="__SRC__",hls=__HLS__,err=document.getElementById('err');
  function fail(){err.style.display='block'}
  v.addEventListener('error',fail);
  if(hls && window.Hls && Hls.isSupported()){var h=new Hls();h.loadSource(src);h.attachMedia(v);
    h.on(Hls.Events.ERROR,function(e,d){if(d.fatal)fail()})}
  else{v.src=src}
})();
</script></body></html>"""


async def watch_page(request: web.Request) -> web.Response:
    token = request.match_info["token"]
    rec = _get(token)
    if not rec:
        return _error_page("Link expired", "This link is no longer active. Send the TeraBox link to the bot again to get a fresh one.", 410)
    hls = _is_hls(rec["stream_url"]) and not _is_hls_dl(rec)
    src = f"/hls/{token}/{_b64(rec['stream_url'])}/{_sig(rec['stream_url'])}" if hls else f"/stream/{token}"
    poster = f'poster="/thumb/{token}"' if rec.get("thumb") else ""
    bot_link = "https://t.me/" + (request.app.get("bot_username") or "")
    page = (WATCH_TEMPLATE
            .replace("__TITLE__", html.escape(rec["title"]))
            .replace("__BRAND_UP__", html.escape(BRAND_NAME.upper()))
            .replace("__BRAND__", html.escape(BRAND_NAME))
            .replace("__TAGLINE__", html.escape(BRAND_TAGLINE))
            .replace("__SIZE__", html.escape(str(rec["size"])))
            .replace("__DL__", f"/dl/{token}")
            .replace("__BOT__", html.escape(bot_link))
            .replace("__LIMIT__", str(MAX_DOWNLOAD_GB))
            .replace("__POSTER__", poster)
            .replace("__SRC__", src)
            .replace("__HLS__", "true" if hls else "false"))
    return web.Response(text=page, content_type="text/html",
                        headers={"Cache-Control": "no-store", "Referrer-Policy": "no-referrer"})


def _is_hls_dl(rec) -> bool:
    """True when the download link itself is a playable mp4 (so we prefer progressive play)."""
    u = (rec.get("download_url") or "")
    return bool(u) and not _is_hls(u)


# --------------------------------------------------------------------- proxy
async def _proxy(request: web.Request, url: str, name: str, inline: bool, default_type: str) -> web.StreamResponse:
    if PROXY_MODE == "redirect":
        raise web.HTTPFound(url)
    headers = dict(UP_HEADERS)
    if request.headers.get("Range"):
        headers["Range"] = request.headers["Range"]
    try:
        up = await _SESSION.get(url, headers=headers, allow_redirects=True)
    except Exception as e:
        logger.warning(f"upstream error: {scrub(e)}")
        return _error_page("Server busy", "Could not reach the file server. Please try again.", 502)
    try:
        if up.status not in (200, 206):
            return _error_page("File unavailable", "The file link has expired. Send the TeraBox link to the bot again.", 502)
        resp = web.StreamResponse(status=up.status)
        for h in PASS_HEADERS:
            if h in up.headers:
                resp.headers[h] = up.headers[h]
        ctype = up.headers.get("Content-Type", "")
        if not ctype or ctype.startswith(("application/octet-stream", "text/")) and inline:
            ctype = default_type
        resp.headers["Content-Type"] = ctype or default_type
        resp.headers.setdefault("Accept-Ranges", "bytes")
        resp.headers["Content-Disposition"] = _content_disposition(name, inline)
        resp.headers["Cache-Control"] = "private, no-store"
        await resp.prepare(request)
        try:
            async for chunk in up.content.iter_chunked(256 * 1024):
                await resp.write(chunk)
        except (ConnectionResetError, asyncio.CancelledError):
            pass
        except Exception as e:
            logger.info(f"stream ended: {scrub(e)}")
        try:
            await resp.write_eof()
        except Exception:
            pass
        return resp
    finally:
        up.release()


async def download(request: web.Request):
    rec = _get(request.match_info["token"])
    if not rec:
        return _error_page("Link expired", "This download link is no longer active.", 410)
    return await _proxy(request, rec["download_url"], rec["title"], False, "application/octet-stream")


async def stream(request: web.Request):
    rec = _get(request.match_info["token"])
    if not rec:
        return _error_page("Link expired", "This link is no longer active.", 410)
    return await _proxy(request, rec["download_url"], rec["title"], True, "video/mp4")


async def thumb(request: web.Request):
    rec = _get(request.match_info["token"])
    if not rec or not rec.get("thumb"):
        raise web.HTTPNotFound()
    try:
        async with _SESSION.get(rec["thumb"], headers=UP_HEADERS) as up:
            data = await up.read()
            return web.Response(body=data, content_type=up.headers.get("Content-Type", "image/jpeg"),
                                headers={"Cache-Control": "private, max-age=600"})
    except Exception:
        raise web.HTTPNotFound()


# HLS (m3u8) support: playlist is rewritten so every segment also goes through this server
async def hls(request: web.Request):
    token, enc, sig = request.match_info["token"], request.match_info["enc"], request.match_info["sig"]
    if not _get(token):
        return _error_page("Link expired", "This link is no longer active.", 410)
    try:
        url = _unb64(enc)
    except Exception:
        raise web.HTTPBadRequest()
    if not hmac.compare_digest(sig, _sig(url)):
        raise web.HTTPForbidden()
    try:
        up = await _SESSION.get(url, headers=UP_HEADERS)
    except Exception as e:
        logger.warning(f"hls upstream error: {scrub(e)}")
        raise web.HTTPBadGateway()
    try:
        ctype = up.headers.get("Content-Type", "")
        is_playlist = url.lower().split("?")[0].endswith(".m3u8") or "mpegurl" in ctype.lower()
        if is_playlist:
            text = await up.text()
            out = []
            for line in text.splitlines():
                s = line.strip()
                if s and not s.startswith("#"):
                    absu = urljoin(url, s)
                    line = f"/hls/{token}/{_b64(absu)}/{_sig(absu)}"
                elif 'URI="' in s:
                    def _r(m):
                        absu = urljoin(url, m.group(1))
                        return f'URI="/hls/{token}/{_b64(absu)}/{_sig(absu)}"'
                    line = re.sub(r'URI="([^"]+)"', _r, line)
                out.append(line)
            return web.Response(text="\n".join(out), content_type="application/vnd.apple.mpegurl",
                                headers={"Cache-Control": "no-store"})
        data = await up.read()
        return web.Response(body=data, content_type=ctype or "video/mp2t", headers={"Cache-Control": "no-store"})
    finally:
        up.release()


async def index(request: web.Request):
    return _error_page(BRAND_NAME, BRAND_TAGLINE + " — open the Telegram bot to get your link.", 200)


async def health(request: web.Request):
    return web.Response(text="ok")


# --------------------------------------------------------------------- start
_RUNNER = None


async def start_web(bot_username: str = ""):
    """Starts the web server inside the bot's event loop."""
    global _SESSION, _RUNNER
    timeout = aiohttp.ClientTimeout(total=None, sock_connect=30, sock_read=120)
    _SESSION = aiohttp.ClientSession(timeout=timeout)
    app = web.Application()
    app["bot_username"] = bot_username
    app.add_routes([
        web.get("/", index),
        web.get("/health", health),
        web.get("/watch/{token}", watch_page),
        web.get("/dl/{token}", download),
        web.get("/stream/{token}", stream),
        web.get("/thumb/{token}", thumb),
        web.get("/hls/{token}/{enc}/{sig}", hls),
    ])
    _RUNNER = web.AppRunner(app, access_log=None)
    await _RUNNER.setup()
    await web.TCPSite(_RUNNER, "0.0.0.0", PORT).start()
    asyncio.create_task(_cleanup_loop())
    logger.info(f"🌐 Web server running on port {PORT} | BASE_URL = {BASE_URL or 'NOT SET'}")


async def stop_web():
    if _RUNNER:
        await _RUNNER.cleanup()
    if _SESSION:
        await _SESSION.close()
