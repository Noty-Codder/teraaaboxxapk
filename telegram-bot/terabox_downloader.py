"""
TeraBox Engine - uses your own TeraBox API (Cloudflare worker)
Set TERABOX_API_URL in .env, e.g. https://xxxx.workers.dev/api?url=
The API is called as:  <TERABOX_API_URL><encoded terabox link>
Response JSON is parsed flexibly (common key names are supported).
The API address is registered as a secret, so it never appears in user
messages, buttons or log-group messages (see utils.scrub).
"""
import aiohttp
import logging
from urllib.parse import quote
from config import TERABOX_API_URL, TERABOX_BACKUP_APIS
from playmast_uploader import playmast
from utils import register_secret, scrub

logger = logging.getLogger("BetaBotHub.TeraBox")

for _api in [TERABOX_API_URL] + list(TERABOX_BACKUP_APIS):
    register_secret(_api)

_VIDEO_EXT = (".mp4", ".mkv", ".mov", ".avi", ".webm", ".m4v", ".ts", ".flv", ".wmv", ".3gp")


def build_api_url(base: str, link: str) -> str:
    """Accepts '.../api?url=' (prefix style) or a plain worker address."""
    base = base.strip()
    enc = quote(link.strip(), safe="")
    if "?url=" in base or base.endswith("="):
        return base + enc
    if base.rstrip("/").endswith("/api"):
        return f"{base.rstrip('/')}?url={enc}"
    return f"{base.rstrip('/')}/api?url={enc}"


class TeraBoxError(Exception):
    pass


def _pick(d, *keys):
    if not isinstance(d, dict):
        return None
    for k in keys:
        v = d.get(k)
        if v not in (None, "", []):
            return v
    return None


def _human_size(n):
    try:
        n = float(n)
    except (TypeError, ValueError):
        return str(n) if n else "N/A"
    for unit in ["B", "KB", "MB", "GB", "TB"]:
        if n < 1024:
            return f"{n:.2f} {unit}"
        n /= 1024
    return f"{n:.2f} PB"


def _to_bytes(v):
    try:
        return int(float(v))
    except (TypeError, ValueError):
        return 0


class TeraBoxDownloader:
    def __init__(self):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                          "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
            "Accept": "application/json,*/*",
        }

    async def extract(self, url: str) -> dict:
        apis = [a for a in [TERABOX_API_URL] + TERABOX_BACKUP_APIS if a]
        if not apis:
            raise TeraBoxError("TERABOX_API_URL is not set (add it in your host variables / .env)")
        last = None
        for base in apis:
            try:
                return await self._extract_one(base, url)
            except Exception as e:
                if last is None or not isinstance(last, TeraBoxError) or "API error" in str(last):
                    last = e
                logger.warning(f"TeraBox API failed: {scrub(e)}")
        raise last if isinstance(last, TeraBoxError) else TeraBoxError("Could not fetch the video, please try again later")

    async def _extract_one(self, base: str, url: str) -> dict:
        api = build_api_url(base, url)
        timeout = aiohttp.ClientTimeout(total=60)
        async with aiohttp.ClientSession(timeout=timeout, headers=self.headers) as s:
            async with s.get(api) as r:
                try:
                    data = await r.json(content_type=None)
                except Exception:
                    raise TeraBoxError(f"TeraBox API error {r.status}")
                if r.status != 200 and not (isinstance(data, dict) and data.get("success") is False):
                    raise TeraBoxError(f"TeraBox API error {r.status}")

        # unwrap common wrappers (prefer the first VIDEO when a list is returned)
        def _first(lst):
            for x in lst:
                nm = str(_pick(x, "file_name", "filename", "server_filename", "name", "title") or "").lower()
                if nm.endswith(_VIDEO_EXT) or str(_pick(x, "category", "type") or "").lower() in ("1", "video"):
                    return x
            return lst[0]

        item = data
        for key in ("data", "result", "response", "file", "files", "list", "items"):
            v = item.get(key) if isinstance(item, dict) else None
            if isinstance(v, list) and v:
                item = _first(v)
            elif isinstance(v, dict):
                item = v
        if isinstance(item, list) and item:
            item = _first(item)
        if isinstance(data, dict) and (data.get("success") is False or data.get("errno") not in (None, 0)):
            raise TeraBoxError(_pick(data, "error", "message", "errmsg", "msg") or "Link is invalid / private")
        if isinstance(data, dict) and data.get("ok") is False or (isinstance(data, dict) and data.get("status") in ("error", False)):
            raise TeraBoxError(_pick(data, "message", "error", "msg") or "Link is invalid / private")

        dl = _pick(item, "download_url", "download_link", "downloadLink", "downloadUrl", "direct_link", "direct_url",
                   "stream_download_url", "dlink", "fast_download_link", "slow_download_link", "proxy_url",
                   "download", "link", "url")
        if isinstance(dl, dict):
            dl = _pick(dl, "url_1", "url_2", "url", "link")
        stream = _pick(item, "stream_url", "streamUrl", "stream_link", "streaming_url", "watch_url", "play_url",
                       "m3u8", "stream") or dl
        if isinstance(stream, dict):
            stream = _pick(stream, "url", "link", "m3u8", "url_1") or dl
        if not dl:
            raise TeraBoxError("No video found for this link (it may be private/expired)")

        size_raw = _pick(item, "size_bytes", "sizebytes", "size", "file_size", "filesize")
        size_bytes = _to_bytes(size_raw) if not (isinstance(size_raw, str) and not size_raw.replace(".", "").isdigit()) else 0
        size_txt = _pick(item, "size_formatted", "formatted_size", "readable_size") or (
            _human_size(size_bytes) if size_bytes else (str(size_raw) if size_raw else "N/A"))

        thumb = _pick(item, "thumbnail", "thumb", "thumbnail_url", "image", "thumbs") or _pick(data.get("data") if isinstance(data, dict) else None, "thumbnail")
        if isinstance(thumb, dict):
            thumb = _pick(thumb, "url3", "url2", "url1", "icon")

        return {
            "title": str(_pick(item, "file_name", "filename", "server_filename", "name", "title") or "TeraBox_File"),
            "size": size_txt,
            "size_bytes": size_bytes,
            "thumbnail_url": thumb,
            "download_url": dl,
            "stream_url": stream,
            "type": "video",
        }

    async def upload_file(self, file_path: str, title: str = None, description: str = "", progress_callback=None) -> str:
        """Uploads the file to PlayMast Cloud and returns the PlayMast share link."""
        res = await playmast.upload_file(file_path=file_path, title=title, description=description,
                                         progress_callback=progress_callback)
        return res["url"]
