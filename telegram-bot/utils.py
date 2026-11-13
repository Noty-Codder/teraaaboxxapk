"""
Small dependency-free helpers (easy to test).
- html_prefix(): cut a Telegram-HTML string at N visible characters and close open tags
  (used for the live typewriter welcome message)
- progress helpers: size / time / bar formatting
- scrub(): removes API URLs / secrets from any text before it is shown or logged
"""
import re

# ------------------------------------------------------------------ formatting
def fmt_size(n) -> str:
    n = float(n or 0)
    for u in ("B", "KB", "MB", "GB", "TB"):
        if n < 1024:
            return f"{n:.2f} {u}"
        n /= 1024
    return f"{n:.2f} PB"


def fmt_time(sec) -> str:
    sec = int(max(0, sec))
    h, rem = divmod(sec, 3600)
    m, s = divmod(rem, 60)
    return f"{h:02d}:{m:02d}:{s:02d}" if h else f"{m:02d}:{s:02d}"


def progress_bar(current, total, length: int = 12) -> str:
    pct = (current / total * 100) if total else 0
    pct = max(0.0, min(100.0, pct))
    filled = int(length * pct / 100)
    return f"{'▰' * filled}{'▱' * (length - filled)} {pct:.1f}%"


# ------------------------------------------------------------------ typewriter
_TOKEN = re.compile(r"(<[^>]+>|&[#\w]+;|[^<&]|&)", re.S)
_TAG = re.compile(r"<\s*(/?)\s*([a-zA-Z0-9\-]+)([^>]*)>")


def html_prefix(html_text: str, visible: int) -> str:
    """Return the HTML up to `visible` visible characters, with every open tag closed.
    Tags and &entities; count as zero / one character, so the result is always valid
    Telegram HTML no matter where it is cut."""
    out, stack, count = [], [], 0
    for tok in _TOKEN.findall(html_text):
        if tok.startswith("<") and tok.endswith(">"):
            m = _TAG.match(tok)
            if m:
                closing, name = m.group(1), m.group(2).lower()
                if closing:
                    if name in stack:
                        # close up to and including this tag
                        while stack:
                            top = stack.pop()
                            if top == name:
                                break
                    out.append(tok)
                elif not tok.rstrip().endswith("/>"):
                    stack.append(name)
                    out.append(tok)
                else:
                    out.append(tok)
            else:
                out.append(tok)
            continue
        if count >= visible:
            break
        out.append(tok)
        count += 1
    for name in reversed(stack):
        out.append(f"</{name}>")
    return "".join(out)


def visible_length(html_text: str) -> int:
    return sum(1 for t in _TOKEN.findall(html_text) if not (t.startswith("<") and t.endswith(">")))


# ------------------------------------------------------------------ secrets
_SECRETS: list = []


def register_secret(value: str):
    """Anything registered here is replaced with *** in scrub()."""
    value = (value or "").strip()
    if len(value) >= 6 and value not in _SECRETS:
        _SECRETS.append(value)
        # also hide the bare host and the url without query
        base = value.split("?")[0].rstrip("/")
        if len(base) >= 6 and base not in _SECRETS:
            _SECRETS.append(base)
        host = re.sub(r"^https?://", "", base).split("/")[0]
        if len(host) >= 6 and host not in _SECRETS:
            _SECRETS.append(host)
        _SECRETS.sort(key=len, reverse=True)


def scrub(text) -> str:
    text = str(text)
    for s in _SECRETS:
        text = text.replace(s, "***")
    # generic: any workers.dev address
    text = re.sub(r"https?://[\w\-.]+\.workers\.dev[^\s'\"<>)]*", "***", text)
    return text
