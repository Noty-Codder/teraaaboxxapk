"""
Configuration for Beta Bot Hub Telegram Bot
"""
import os
from dotenv import load_dotenv

load_dotenv()

def _env(name, default=""):
    """Read env var; strips spaces and accidental quotes (common Railway/Heroku paste mistake)."""
    v = os.getenv(name)
    if v is None or not v.strip():
        return default
    return v.strip().strip('"').strip("'").strip()


# ---------------------------------------------------------------------------
# Telegram API credentials from https://my.telegram.org  ->  API development tools
# API_ID and API_HASH MUST belong to the SAME app, otherwise Telegram says
# "API_ID_INVALID - api_id/api_hash combination is invalid".
# Set them in Railway/Heroku Variables (recommended) OR paste them below.
# ---------------------------------------------------------------------------
_DEFAULT_API_ID = "29448785"
_DEFAULT_API_HASH = "1050dc92ba96ec604133a0e0a5b90279"
_DEFAULT_BOT_TOKEN = "8848069833:AAHt7-sWX6O_fbfidXF6sPdCCOwv61ZmazQ"

try:
    API_ID = int(_env("API_ID", _DEFAULT_API_ID))
except ValueError:
    raise SystemExit("CONFIG ERROR: API_ID must be only digits (e.g. 12345678), no spaces/letters.")
API_HASH = _env("API_HASH", _DEFAULT_API_HASH)
BOT_TOKEN = _env("BOT_TOKEN", _DEFAULT_BOT_TOKEN)

if len(API_HASH) != 32:
    raise SystemExit(
        "CONFIG ERROR: API_HASH must be exactly 32 characters (got %d). "
        "Copy API_ID + API_HASH of the SAME app from https://my.telegram.org" % len(API_HASH)
    )
if ":" not in BOT_TOKEN:
    raise SystemExit("CONFIG ERROR: BOT_TOKEN invalid. Get it from @BotFather.")

# Admin & Owner IDs (comma-separated IDs)
ADMIN_IDS = [int(x.strip()) for x in os.getenv("ADMIN_IDS", "-1003812209413").split(",") if x.strip()]

# Telegram Group & Channel for force-join referral verification
CHANNEL_USERNAME = os.getenv("CHANNEL_USERNAME", "@betabot_support")
GROUP_USERNAME = os.getenv("GROUP_USERNAME", "@BetaBot_hub")

# TeraBox Cookie credentials
TERABOX_COOKIE = os.getenv("TERABOX_COOKIE", "")

# ---------------------------------------------------------------------------
# TeraBox download API (Cloudflare worker).  KEEP THIS SECRET - set it only in
# your host's environment variables / .env, never commit it to GitHub.
# Accepted formats (all work):
#   https://xxxx.workers.dev/api?url=      <- full prefix, link is appended
#   https://xxxx.workers.dev               <- "/api?url=" is added for you
# Backup APIs (comma-separated) are tried if the main one fails.
# ---------------------------------------------------------------------------
TERABOX_API_URL = os.getenv("TERABOX_API_URL", "https://samratbdownload.krishnalucky193.workers.dev").strip()
TERABOX_BACKUP_APIS = [x.strip() for x in os.getenv("TERABOX_BACKUP_APIS", "https://tbdownload.krishnalucky193.workers.dev").split(",") if x.strip()]

# "Join Bot Updates" button shown under every video
UPDATES_CHANNEL = os.getenv("UPDATES_CHANNEL", os.getenv("CHANNEL_USERNAME", "@BetaBot_hub"))

# ---------------------------------------------------------------------------
# Size rules
#   <= MAX_SEND_MB            : video is sent straight into the chat + Watch/Download buttons
#   > MAX_SEND_MB (Telegram)  : no video in chat, only Watch Now / Download Now buttons
#   > MAX_DOWNLOAD_GB (2.99)  : no video in chat, warning shown + Watch Now / Download Now buttons
# Telegram bots can send at most 2000 MB per file, so MAX_SEND_MB is capped at 2000.
# ---------------------------------------------------------------------------
MAX_SEND_MB = min(int(os.getenv("MAX_SEND_MB", "2000")), 2000)
MAX_DOWNLOAD_GB = float(os.getenv("MAX_DOWNLOAD_GB", "2.99"))
MAX_DOWNLOAD_BYTES = int(MAX_DOWNLOAD_GB * 1024 * 1024 * 1024)
# Max size of a file users can send to the bot for upload (Telegram limit = 2000 MB)
MAX_UPLOAD_MB = min(int(os.getenv("MAX_UPLOAD_MB", "2000")), 2000)
# How many big downloads run at the same time (keeps bot from hanging)
MAX_PARALLEL_JOBS = int(os.getenv("MAX_PARALLEL_JOBS", "4"))

# ---------------------------------------------------------------------------
# Branding
# ---------------------------------------------------------------------------
BRAND_NAME = os.getenv("BRAND_NAME", "Beta Bot Hub")
BRAND_TAGLINE = os.getenv("BRAND_TAGLINE", "TeraBox Video Downloader & Cloud Uploader")
WELCOME_TYPING = os.getenv("WELCOME_TYPING", "true").lower() in ("1", "true", "yes", "on")

# ---------------------------------------------------------------------------
# Built-in web server (Watch Now / Download Now pages).
# It hides your API: users only ever see  BASE_URL/watch/<token>  links.
#   PORT      : Heroku / Railway / Render set this automatically. On a VPS use 8080.
#   BASE_URL  : public address of this bot server, e.g. https://mybot.up.railway.app
#               (auto-detected on Railway / Heroku / Render when possible)
# ---------------------------------------------------------------------------
PORT = int(os.getenv("PORT", "8080"))


def _detect_base_url() -> str:
    explicit = os.getenv("BASE_URL", "").strip().rstrip("/")
    if explicit:
        return explicit if explicit.startswith("http") else f"https://{explicit}"
    if os.getenv("RAILWAY_PUBLIC_DOMAIN"):
        return f"https://{os.getenv('RAILWAY_PUBLIC_DOMAIN').strip()}"
    if os.getenv("RENDER_EXTERNAL_URL"):
        return os.getenv("RENDER_EXTERNAL_URL").strip().rstrip("/")
    if os.getenv("HEROKU_APP_NAME"):
        return f"https://{os.getenv('HEROKU_APP_NAME').strip()}.herokuapp.com"
    return ""


BASE_URL = _detect_base_url()
# How long Watch / Download links stay alive (minutes)
WEB_LINK_TTL_MINUTES = int(os.getenv("WEB_LINK_TTL_MINUTES", "360"))
# stream  = file is streamed through your server (API + CDN link fully hidden)  [recommended]
# redirect = user is redirected to the CDN link (saves server bandwidth, CDN link visible)
PROXY_MODE = os.getenv("PROXY_MODE", "stream").lower()
# Secret used to sign internal links. Set any random string for stable links across restarts.
WEB_SECRET = os.getenv("WEB_SECRET", "") or os.urandom(16).hex()

# PlayMast Uploader API (uploads go here, users get PlayMast links)
PLAYMAST_API_URL = os.getenv("PLAYMAST_API_URL", "https://playmast-studio-bot.loca.lt")
PLAYMAST_API_TOKEN = os.getenv("PLAYMAST_API_TOKEN", "")
PLAYMAST_EMAIL = os.getenv("PLAYMAST_EMAIL", "")
PLAYMAST_PASSWORD = os.getenv("PLAYMAST_PASSWORD", "")

# Start message photo (URL or Telegram file_id). Leave empty for text-only start.
START_PIC = os.getenv("START_PIC", "")

# BETA BOT HUB Auto Payment Gateway (get API key from /dashboard)
PAYMENT_API_URL = os.getenv("PAYMENT_API_URL", "https://betapaymentgateway.up.railway.app")
PAYMENT_API_KEY = os.getenv("PAYMENT_API_KEY", "")
PAYMENT_EMAIL_DOMAIN = os.getenv("PAYMENT_EMAIL_DOMAIN", "betabothub.app")
PAYMENT_POLL_SECONDS = int(os.getenv("PAYMENT_POLL_SECONDS", "8"))

# Database: MongoDB Atlas URI (falls back to SQLite if empty)
MONGODB_URI = os.getenv("MONGODB_URI", "")
DB_NAME = os.getenv("DB_NAME", "betabothub")

# Dynamic Timers
QR_EXPIRY_MINUTES = int(os.getenv("QR_EXPIRY_MINUTES", "10"))
MEDIA_AUTO_DELETE_MINUTES = int(os.getenv("MEDIA_AUTO_DELETE_MINUTES", "5"))

# Watermark
WATERMARK_TEXT = os.getenv("WATERMARK_TEXT", "BETA BOT HUB")

# 3 Dedicated Telegram Logger Groups (Telegram Groups/Supergroups, not channels)
LOG_GROUP_ID = os.getenv("LOG_GROUP_ID", os.getenv("LOG_CHANNEL_ID", "-1004424419753"))
PAYMENT_LOG_GROUP_ID = os.getenv("PAYMENT_LOG_GROUP_ID", os.getenv("PAYMENT_LOG_CHANNEL", "-1004373603530"))
DATA_LOG_GROUP_ID = os.getenv("DATA_LOG_GROUP_ID", os.getenv("DATA_LOG_CHANNEL", os.getenv("ERROR_LOG_CHANNEL", "-1004370198837")))

# Aliases for backward compatibility
LOG_CHANNEL_ID = LOG_GROUP_ID
PAYMENT_LOG_CHANNEL = PAYMENT_LOG_GROUP_ID
DATA_LOG_CHANNEL = DATA_LOG_GROUP_ID

# Plan Limits
PLANS = {
    "free": {
        "name": "Free Plan",
        "downloads_per_day": 3,
        "uploads_per_day": 3,
        "price": 0
    },
    "pro_7d": {
        "name": "Pro 7 Days",
        "downloads_per_day": 17,
        "uploads_per_day": 15,
        "price": 15,
        "days": 7
    },
    "pro_30d": {
        "name": "Pro 30 Days",
        "downloads_per_day": 17,
        "uploads_per_day": 15,
        "price": 27,
        "days": 30
    },
    "beta_30d": {
        "name": "Beta VIP Monthly",
        "downloads_per_day": 999999,
        "uploads_per_day": 999999,
        "price": 69,
        "days": 30
    }
}
