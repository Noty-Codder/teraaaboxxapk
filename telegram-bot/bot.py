"""
Beta Bot Hub - Ultra Advanced TeraBox Telegram Bot
Features:
- Direct video, audio & PDF file delivery directly to user chat
- 5-Minute media auto-deletion with warning & countdown
- Auto-verified UPI payments via BETA BOT HUB Payment Gateway (10-minute QR)
- Owner & Admin manual premium grant (/addpremium <uid> <duration> <plan>)
- Multi-tier quotas: Free (3/d), Pro 7d (₹15), Pro 30d (₹27), Beta VIP (₹69/m)
- Dual Database: MongoDB Atlas (motor) with SQLite fallback
- Referral tracking (3 referrals = 1 day free pass)
- Force Join check for Group & Support Channel
"""

import os
import io
import time
import asyncio
import logging
import datetime
from urllib.parse import quote
from ftmgram import Client, filters, idle
from ftmgram.enums import ParseMode, ButtonStyle
from ftmgram.helpers import RichMessageBuilder, Button
from ftmgram.types import InputRichMessage
from ftmgram.types import (
    InlineKeyboardMarkup, InlineKeyboardButton as _RawInlineKeyboardButton,
    Message, CallbackQuery
)
from ftmgram.errors import (
    UserNotParticipant, FloodWait, UserIsBlocked,
    PeerIdInvalid, InputUserDeactivated
)
from config import (
    BOT_TOKEN, API_ID, API_HASH, ADMIN_IDS,
    GROUP_USERNAME, CHANNEL_USERNAME, PAYMENT_EMAIL_DOMAIN, PAYMENT_POLL_SECONDS,
    WATERMARK_TEXT, PLANS, QR_EXPIRY_MINUTES, MEDIA_AUTO_DELETE_MINUTES,
    LOG_GROUP_ID, PAYMENT_LOG_GROUP_ID, DATA_LOG_GROUP_ID
)
from database import db
from terabox_downloader import TeraBoxDownloader
from payment_gateway import gateway, PaymentError
from watermark_engine import stamp_watermark
import qrcode
import html
import json
import tempfile
import aiohttp
from ftmgram.errors import ChatAdminRequired, ChannelPrivate
from config import (
    UPDATES_CHANNEL, START_PIC, MAX_SEND_MB, MAX_UPLOAD_MB, MAX_PARALLEL_JOBS,
    MAX_DOWNLOAD_GB, MAX_DOWNLOAD_BYTES, BRAND_NAME, BRAND_TAGLINE, WELCOME_TYPING,
    BASE_URL, TERABOX_API_URL,
)
from terabox_downloader import TeraBoxError
from utils import fmt_size, fmt_time, progress_bar, html_prefix, visible_length, scrub
from webserver import create_links, web_enabled, start_web, stop_web

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("BetaBotHub")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_BANNER = os.path.join(BASE_DIR, "assets", "banner.png")

# ---- Styled buttons (ftmgram ButtonStyle) --------------------------------
# Button names / links are unchanged; only colour style is added automatically.
_DANGER_WORDS = ("cancel", "remove", "delete", "close")
_SUCCESS_WORDS = ("open", "pay", "check", "verify", "download", "join", "upgrade", "renew", "share")


def InlineKeyboardButton(text, *args, style=None, **kwargs):
    if style is None:
        low = str(text).lower()
        cb = str(kwargs.get("callback_data") or (args[0] if args else "") or "").lower()
        if any(w in low or w in cb for w in _DANGER_WORDS):
            style = ButtonStyle.DANGER
        elif kwargs.get("url") or any(w in low for w in _SUCCESS_WORDS):
            style = ButtonStyle.SUCCESS
        else:
            style = ButtonStyle.PRIMARY
    elif isinstance(style, str):
        style = {"success": ButtonStyle.SUCCESS, "primary": ButtonStyle.PRIMARY,
                 "danger": ButtonStyle.DANGER}.get(style, ButtonStyle.DEFAULT)
    try:
        return _RawInlineKeyboardButton(text, *args, style=style, **kwargs)
    except TypeError:
        return _RawInlineKeyboardButton(text, *args, **kwargs)



# ---- Live progress bar (speed, ETA, elapsed) -------------------------------
_fmt_size = fmt_size
_fmt_time = fmt_time


def make_progress_bar(current, total, length=12):
    return progress_bar(current, total, length)


class ThrottledProgress:
    """Edits a status message with a live progress panel at most every `interval` seconds
    (avoids FloodWait): bar, percent, processed size, speed, ETA and elapsed time."""

    def __init__(self, status_msg, header: str, interval: float = 3.5):
        self.msg = status_msg
        self.header = header
        self.interval = interval
        self.start = time.time()
        self.last = 0.0

    async def __call__(self, current, total, *args):
        now = time.time()
        done = bool(total) and current >= total
        if not done and now - self.last < self.interval:
            return
        self.last = now
        elapsed = max(now - self.start, 0.001)
        speed = current / elapsed
        eta = ((total - current) / speed) if speed and total else 0
        text = (
            f"{self.header}\n\n"
            f"<code>{make_progress_bar(current, total)}</code>\n\n"
            f"📦 <b>Processed:</b> <code>{fmt_size(current)} / {fmt_size(total) if total else '?'}</code>\n"
            f"🚀 <b>Speed:</b> <code>{fmt_size(speed)}/s</code>\n"
            f"⏳ <b>ETA:</b> <code>{fmt_time(eta)}</code>\n"
            f"⏱️ <b>Elapsed:</b> <code>{fmt_time(elapsed)}</code>"
        )
        try:
            await self.msg.edit_text(text)
        except FloodWait as fw:
            self.last = now + fw.value
        except Exception:
            pass


async def send_rich_or_text(client, chat_id, html_text, reply_markup=None, reply_to_message_id=None):
    """Send as ftmgram Rich Message (HTML) with styled keyboard; fall back to plain HTML text."""
    try:
        return await client.send_rich_message(
            chat_id=chat_id,
            rich_message=InputRichMessage(html=html_text),
            reply_to_message_id=reply_to_message_id,
            reply_markup=reply_markup,
        )
    except Exception as e:
        logger.warning(f"Rich message failed ({e}); falling back to HTML text")
        return await client.send_message(
            chat_id, html_text, reply_markup=reply_markup,
            reply_to_message_id=reply_to_message_id, disable_web_page_preview=True,
        )


app = Client(
    "BetaBotHubSession",
    api_id=API_ID,
    api_hash=API_HASH,
    bot_token=BOT_TOKEN,
    parse_mode=ParseMode.HTML,
    workers=32,
    max_concurrent_transmissions=MAX_PARALLEL_JOBS,
)

# Heavy jobs share a limited pool; each user can run only one job at a time,
# so one big file never blocks the bot for everyone else.
JOB_SLOTS = None
BUSY_USERS = set()


def _job_slots():
    global JOB_SLOTS
    if JOB_SLOTS is None:
        JOB_SLOTS = asyncio.Semaphore(MAX_PARALLEL_JOBS)
    return JOB_SLOTS

terabox = TeraBoxDownloader()

# -------------------------------------------------------------
# Realtime Telegram Group Logger Helper
# (Destination IDs are Telegram Groups / Supergroups, not channels)
# -------------------------------------------------------------
LOGGER_PEERS = {}


def _parse_chat_id(group_id):
    clean = str(group_id).strip()
    if clean.lstrip("-").isdigit():
        return int(clean)
    return clean


async def init_logger_groups(client: Client):
    """Resolves all logger groups once at startup. Without this Pyrogram throws
    PEER_ID_INVALID on a fresh session and logs never arrive."""
    for name, gid in (("Bot/Start Logger", LOG_GROUP_ID), ("Payment Logger", PAYMENT_LOG_GROUP_ID), ("Download/Upload Logger", DATA_LOG_GROUP_ID)):
        if not gid:
            logger.warning(f"{name}: ID is not set (.env)")
            continue
        try:
            chat = await client.get_chat(_parse_chat_id(gid))
            LOGGER_PEERS[str(gid)] = chat.id
            logger.info(f"✅ {name} connected: {chat.title} ({chat.id})")
        except Exception as e:
            logger.error(f"❌ {name} ({gid}) is not reachable: {e} -> add the bot to the group and make it admin")


async def send_group_log(client: Client, group_id: str, text: str, reply_markup=None):
    """Sends real-time logs to designated Telegram Group/Supergroup"""
    if not group_id:
        return
    target = LOGGER_PEERS.get(str(group_id), _parse_chat_id(group_id))
    for attempt in range(2):
        try:
            await client.send_message(chat_id=target, text=text[:4000], reply_markup=reply_markup, disable_web_page_preview=True)
            return
        except FloodWait as fw:
            await asyncio.sleep(fw.value + 1)
        except PeerIdInvalid:
            try:
                chat = await client.get_chat(_parse_chat_id(group_id))
                LOGGER_PEERS[str(group_id)] = target = chat.id
            except Exception as e:
                logger.warning(f"Logger group {group_id} not reachable: {e}")
                return
        except Exception as e:
            logger.warning(f"Failed to post to Telegram Logger Group ({group_id}): {e}")
            return


def _now_str():
    return datetime.datetime.now().strftime('%d %b %Y, %I:%M %p')


# -------------------------------------------------------------
# Background Task: Media Auto-Delete with User Notice
# -------------------------------------------------------------
async def schedule_media_autodelete(client: Client, chat_id: int, message_id, delay_seconds: int = 300):
    """Deletes the media (+ its warning message) after delay_seconds and notifies user"""
    ids = message_id if isinstance(message_id, list) else [message_id]
    ids = [i for i in ids if i]
    await asyncio.sleep(delay_seconds)
    try:
        await client.delete_messages(chat_id=chat_id, message_ids=ids)
        await client.send_message(
            chat_id,
            "🗑️ <b>File Auto-Deleted</b>\n\n"
            f"<i>Your file was deleted after {MEDIA_AUTO_DELETE_MINUTES} minutes for privacy.</i>\n"
            "Need it again? Just send the link once more."
        )
    except Exception as e:
        logger.warning(f"Auto-delete error for msgs {ids}: {e}")


# -------------------------------------------------------------
# Helper: Force Join Check (Channel + Group)
# -------------------------------------------------------------
def _chat_link(name: str) -> str:
    n = (name or "").strip()
    if n.startswith("http"):
        return n
    return f"https://t.me/{n.lstrip('@')}"


async def get_missing_joins(client: Client, user_id: int) -> list:
    """Returns list of (label, chat) the user has NOT joined yet."""
    missing = []
    if user_id in ADMIN_IDS:
        return missing
    for label, chat in (("📢 Join Channel", CHANNEL_USERNAME), ("💬 Join Group", GROUP_USERNAME)):
        if not chat:
            continue
        try:
            member = await client.get_chat_member(chat, user_id)
            status = str(getattr(member, "status", "")).lower()
            if "left" in status or "banned" in status or ("restricted" in status and getattr(member, "is_member", True) is False):
                missing.append((label, chat))
        except UserNotParticipant:
            missing.append((label, chat))
        except (ChatAdminRequired, ChannelPrivate) as e:
            logger.error(f"Force-join: bot {chat} is not admin ({e}). Please make the bot an admin.")
        except Exception as e:
            logger.warning(f"Force-join check error for {chat}: {e}")
    return missing


async def is_subscribed(client: Client, user_id: int) -> bool:
    return not await get_missing_joins(client, user_id)


async def force_join_gate(client: Client, message: Message) -> bool:
    """True = user can continue. False = join prompt was shown."""
    missing = await get_missing_joins(client, message.from_user.id)
    if not missing:
        return True
    rows = [[InlineKeyboardButton(label, url=_chat_link(chat))] for label, chat in missing]
    rows.append([InlineKeyboardButton("✅ Verify Now", callback_data="verify_join")])
    await message.reply_text(
        "🔒 <b>Must Join Required!</b>\n\n"
        "To use the bot, please join our <b>Channel</b> and <b>Group</b> first.\n"
        "After joining, tap <b>✅ Verify Now</b> and send your link again.",
        reply_markup=InlineKeyboardMarkup(rows),
        quote=True,
    )
    return False


@app.on_callback_query(filters.regex(r"^verify_join$"))
async def verify_join_callback(client: Client, query: CallbackQuery):
    missing = await get_missing_joins(client, query.from_user.id)
    if missing:
        await query.answer("❌ You have not joined everything yet. Please join the Channel and Group first.", show_alert=True)
        return
    await query.answer("✅ Verified! Ab apna link bhejein.", show_alert=True)
    try:
        await query.message.edit_text(
            "✅ <b>Verification Successful!</b>\n\nAb koi bhi TeraBox link bhejein, main video bhej dunga. 🎬"
        )
    except Exception:
        pass


def get_stylish_main_keyboard():
    return InlineKeyboardMarkup([
        [
            InlineKeyboardButton("📥 Download Link", callback_data="btn_download"),
            InlineKeyboardButton("📤 Create Link", callback_data="btn_upload")
        ],
        [
            InlineKeyboardButton("💎 Plans & Pricing", callback_data="btn_plans"),
            InlineKeyboardButton("👥 Refer & Earn", callback_data="btn_referral")
        ],
        [
            InlineKeyboardButton("📂 My Quota / Stats", callback_data="btn_my_stats"),
            InlineKeyboardButton("❓ Help & Guide", callback_data="btn_help")
        ],
        [
            InlineKeyboardButton("📢 Support Channel", url=f"https://t.me/{CHANNEL_USERNAME.replace('@','')}" if CHANNEL_USERNAME else "https://t.me"),
            InlineKeyboardButton("💬 Community Group", url=f"https://t.me/{GROUP_USERNAME.replace('@','')}" if GROUP_USERNAME else "https://t.me")
        ]
    ])

# -------------------------------------------------------------
# Professional welcome (HTML) + live typewriter effect
# -------------------------------------------------------------
def build_welcome_text(username: str, user: dict) -> str:
    return (
        f"⚡ <b>{html.escape(BRAND_NAME.upper())}</b>\n"
        f"<i>{html.escape(BRAND_TAGLINE)}</i>\n\n"
        f"👋 Hello <b>{username}</b>, welcome aboard!\n\n"
        f"<blockquote>📥 <b>Download</b> — paste any TeraBox link and get the video with "
        f"<b>Watch Now</b> &amp; <b>Download Now</b> buttons.\n"
        f"📤 <b>Upload</b> — send any file and get a PlayMast cloud link.</blockquote>\n"
        f"📊 <b>Your Account</b>\n"
        f"• 💎 Tier: <code>{str(user.get('plan', 'free')).upper()}</code>\n"
        f"• 📥 Downloads left: <code>{user.get('downloads_left', 0)}</code>\n"
        f"• 📤 Uploads left: <code>{user.get('uploads_left', 0)}</code>\n\n"
        f"📏 <b>Limits:</b> up to <code>{MAX_DOWNLOAD_GB} GB</code> per file • "
        f"videos above <code>2 GB</code> come as Watch/Download buttons.\n"
        f"🗑️ <b>Privacy:</b> files auto-delete after <code>{MEDIA_AUTO_DELETE_MINUTES} min</code> — save them quickly!\n\n"
        f"<b>Paste a TeraBox link below to begin</b> 👇"
    )


_BANNER_FILE_ID = ""


async def typewriter_welcome(client: Client, message: Message, text: str, kb):
    """Sends the welcome (photo + caption or plain message) and types it out live by editing it.
    Every frame is valid Telegram HTML (html_prefix closes open tags); the last frame adds the buttons."""
    global _BANNER_FILE_ID
    photo = START_PIC or _BANNER_FILE_ID or (DEFAULT_BANNER if os.path.exists(DEFAULT_BANNER) else "")
    use_photo = bool(photo)
    cursor = " ▌"
    sent = None
    try:
        if use_photo:
            try:
                sent = await message.reply_photo(photo=photo, caption=f"⚡ <b>{html.escape(BRAND_NAME)}</b>{cursor}", quote=True)
                if not START_PIC and not _BANNER_FILE_ID and getattr(sent, "photo", None):
                    _BANNER_FILE_ID = sent.photo.file_id  # upload the banner only once
            except Exception as e:
                logger.warning(f"Welcome photo failed ({scrub(e)}); using text")
                use_photo = False
        if sent is None:
            sent = await message.reply_text(f"⚡{cursor}", quote=True, disable_web_page_preview=True)

        async def _edit(txt, markup=None):
            if use_photo:
                return await sent.edit_caption(txt, reply_markup=markup)
            return await sent.edit_text(txt, reply_markup=markup, disable_web_page_preview=True)

        if WELCOME_TYPING:
            total = visible_length(text)
            frames = 14
            step = max(1, -(-total // frames))
            shown = 0
            while shown < total:
                shown = min(total, shown + step)
                if shown >= total:
                    break
                try:
                    await _edit(html_prefix(text, shown) + cursor)
                except FloodWait as fw:
                    await asyncio.sleep(min(fw.value, 5))
                    break
                except Exception:
                    break
                await asyncio.sleep(0.55)
        await _edit(text, kb)
    except Exception as e:
        logger.warning(f"Typewriter welcome failed: {scrub(e)}")
        try:
            if sent is not None:
                await sent.delete()
        except Exception:
            pass
        await send_rich_or_text(client, message.chat.id, text, reply_markup=kb, reply_to_message_id=message.id)


# -------------------------------------------------------------
# Command: /start
# -------------------------------------------------------------
@app.on_message(filters.command("start") & filters.private)
async def start_handler(client: Client, message: Message):
    user_id = message.from_user.id
    username = html.escape(message.from_user.username or message.from_user.first_name or "User")
    
    # Handle referral start
    referred_by = None
    if len(message.command) > 1:
        param = message.command[1]
        if param.startswith("ref_"):
            try:
                ref_id = int(param.replace("ref_", ""))
                if ref_id != user_id:
                    referred_by = ref_id
            except ValueError:
                pass

    user = await db.get_or_create_user(user_id, username, referred_by)

    # Verify referral if eligible
    if referred_by and not user.get('is_verified'):
        if await is_subscribed(client, user_id):
            await db.verify_user_referral(user_id)
            verified_count = await db.get_verified_referrals_count(referred_by)
            
            # Send notification to referrer
            try:
                await client.send_message(
                    referred_by,
                    f"🎉 <b>New Verified Referral!</b>\n\n"
                    f"User @{username} joined via your referral link and completed channel verification!\n"
                    f"📈 Total Verified Referrals: <b>{verified_count}</b>\n"
                    f"<i>(Every 3 verified referrals = 1 Day Free Pass!)</i>"
                )
                if verified_count % 3 == 0:
                    await db.grant_one_day_pass(referred_by)
                    await client.send_message(
                        referred_by,
                        "🎁 <b>Congratulations! 3 Referrals Milestone Reached!</b>\n\n"
                        "You have unlocked a <b>1-Day Free Premium Pass</b> with bonus download & upload quotas!"
                    )
            except Exception as e:
                logger.error(f"Referral notify error: {e}")

    welcome_text = build_welcome_text(username, user)
    asyncio.create_task(typewriter_welcome(client, message, welcome_text, get_stylish_main_keyboard()))

    # Send Activity Log to Telegram Logger Group
    asyncio.create_task(send_group_log(
        client,
        LOG_GROUP_ID,
        f"👤 <b>New Bot Activity (/start)</b>\n\n"
        f"• <b>User:</b> {html.escape(message.from_user.first_name or '')} (@{message.from_user.username or 'NoUsername'})\n"
        f"• <b>User ID:</b> <code>{user_id}</code>\n"
        f"• <b>Plan:</b> <code>{user.get('plan', 'free').upper()}</code>\n"
        f"• <b>Referred By:</b> <code>{referred_by or 'None'}</code>\n"
        f"• <b>Time:</b> <code>{_now_str()}</code>"
    ))

# -------------------------------------------------------------
# Command: /addpremium (Owner & Admin Manual Premium Assignment)
# Usage: /addpremium <user_id> <1d|7d|1m|1y> <pro|beta>
# -------------------------------------------------------------
@app.on_message(filters.command("addpremium") & filters.private)
async def add_premium_handler(client: Client, message: Message):
    if message.from_user.id not in ADMIN_IDS:
        await message.reply_text("⛔ <b>Access Denied:</b> This command is restricted to Bot Owners and Admins.")
        return

    args = message.command[1:]
    if len(args) < 2:
        await message.reply_text(
            "ℹ️ <b>Manual Premium Grant Usage:</b>\n\n"
            "<code>/addpremium &lt;user_id&gt; &lt;duration&gt; [plan]</code>\n\n"
            "<b>Duration formats:</b>\n"
            "• <code>1d</code>, <code>7d</code>, <code>15d</code> (Days)\n"
            "• <code>1m</code>, <code>3m</code>, <code>6m</code> (Months - 30 days each)\n"
            "• <code>1y</code> (Years - 365 days)\n\n"
            "<b>Plans:</b> <code>pro</code> (default) or <code>beta</code>\n\n"
            "<b>Examples:</b>\n"
            "• <code>/addpremium 12345678 7d pro</code>\n"
            "• <code>/addpremium 12345678 1m beta</code>\n"
            "• <code>/addpremium 12345678 1y pro</code>"
        )
        return

    try:
        target_user_id = int(args[0])
    except ValueError:
        await message.reply_text("❌ Invalid user ID. Must be numeric.")
        return

    duration_str = args[1].lower()
    plan = "beta" if len(args) > 2 and args[2].lower() == "beta" else "pro"

    # Parse duration into days
    days = 0
    if duration_str.endswith("d"):
        days = int(duration_str[:-1])
    elif duration_str.endswith("m"):
        days = int(duration_str[:-1]) * 30
    elif duration_str.endswith("y"):
        days = int(duration_str[:-1]) * 365
    else:
        try:
            days = int(duration_str)
        except ValueError:
            await message.reply_text("❌ Invalid duration format. Use 7d, 1m, or 1y.")
            return

    if days <= 0:
        await message.reply_text("❌ Duration must be greater than 0.")
        return

    # Grant in database
    grant_info = await db.grant_premium(
        user_id=target_user_id,
        plan=plan,
        days=days,
        granted_by=message.from_user.id
    )

    expiry_date_str = grant_info.get('expires_at', f"+{days} days")

    await message.reply_text(
        f"✅ <b>Premium Successfully Granted!</b>\n\n"
        f"👤 <b>Target User ID:</b> <code>{target_user_id}</code>\n"
        f"💎 <b>Assigned Plan:</b> <code>{plan.upper()}</code>\n"
        f"⏳ <b>Duration:</b> <code>{duration_str} ({days} days)</code>\n"
        f"📅 <b>Expires At:</b> <code>{expiry_date_str}</code>"
    )

    # Notify target user
    try:
        await client.send_message(
            target_user_id,
            f"🎉 <b>VIP Premium Subscription Activated!</b>\n\n"
            f"The Bot Admin has granted you <b>{plan.upper()}</b> access for <b>{duration_str}</b>!\n\n"
            f"• 📥 <b>Daily Downloads:</b> <code>{'Unlimited' if plan == 'beta' else '17 per day'}</code>\n"
            f"• 📤 <b>Daily Uploads:</b> <code>{'Unlimited' if plan == 'beta' else '15 per day'}</code>\n"
            f"• 📅 <b>Expiry:</b> <code>{expiry_date_str}</code>\n\n"
            f"Enjoy high speed streaming & direct downloads!"
        )
    except Exception as e:
        logger.warning(f"Could not notify user {target_user_id}: {e}")

# -------------------------------------------------------------
# Command: /removepremium
# -------------------------------------------------------------
@app.on_message(filters.command("removepremium") & filters.private)
async def remove_premium_handler(client: Client, message: Message):
    if message.from_user.id not in ADMIN_IDS:
        await message.reply_text("⛔ Admin access only.")
        return

    if len(message.command) < 2:
        await message.reply_text("Usage: <code>/removepremium &lt;user_id&gt;</code>")
        return

    try:
        target_user_id = int(message.command[1])
    except ValueError:
        await message.reply_text("❌ Invalid user ID.")
        return

    await db.revoke_premium(target_user_id)
    await message.reply_text(f"✅ Premium revoked for user <code>{target_user_id}</code>. User reverted to Free tier.")

# -------------------------------------------------------------
# Command: /checkuser
# -------------------------------------------------------------
@app.on_message(filters.command("checkuser") & filters.private)
async def check_user_handler(client: Client, message: Message):
    if message.from_user.id not in ADMIN_IDS:
        await message.reply_text("⛔ Admin access only.")
        return

    if len(message.command) < 2:
        await message.reply_text("Usage: <code>/checkuser &lt;user_id&gt;</code>")
        return

    try:
        target_user_id = int(message.command[1])
    except ValueError:
        await message.reply_text("❌ Invalid user ID.")
        return

    user_info = await db.get_user_full_info(target_user_id)
    if not user_info:
        await message.reply_text("❌ User not found in database.")
        return

    await message.reply_text(
        f"👤 <b>User Info:</b> <code>{target_user_id}</code>\n\n"
        f"• Username: @{user_info.get('username', 'N/A')}\n"
        f"• Plan: <b>{user_info.get('plan', 'free').upper()}</b>\n"
        f"• Plan Expiry: <code>{user_info.get('plan_expires_at', 'Never (Free)')}</code>\n"
        f"• Downloads Today: <code>{user_info.get('downloads_today', 0)}</code>\n"
        f"• Uploads Today: <code>{user_info.get('uploads_today', 0)}</code>\n"
        f"• Verified Referrals: <code>{user_info.get('verified_referrals', 0)}</code>"
    )

# -------------------------------------------------------------
# Command: /broadcast (Strictly Bot Owner & Admin Only)
# -------------------------------------------------------------
@app.on_message(filters.command("broadcast") & filters.private)
async def broadcast_handler(client: Client, message: Message):
    # Strict Owner & Admin check
    if message.from_user.id not in ADMIN_IDS:
        await message.reply_text(
            "⛔ <b>Access Denied:</b> This broadcast command is strictly restricted to the <b>Bot Owner and Admins only</b>."
        )
        return

    # Check broadcast payload: either reply to a message or provide text argument
    has_reply = bool(message.reply_to_message)
    broadcast_text = " ".join(message.command[1:]).strip() if len(message.command) > 1 else ""

    if not has_reply and not broadcast_text:
        await message.reply_text(
            "📢 <b>Owner & Admin Broadcast Usage:</b>\n\n"
            "• <b>Method 1 (Text):</b> <code>/broadcast &lt;your message here&gt;</code>\n"
            "• <b>Method 2 (Media/Forward):</b> Reply to any photo, video, document, or formatted message with <code>/broadcast</code> to send it exactly as-is to all registered users.\n\n"
            "<i>Anti-Flood protection and live delivery progress are active.</i>"
        )
        return

    # Fetch registered users from database
    user_ids = await db.get_all_user_ids()
    total_users = len(user_ids)

    if total_users == 0:
        await message.reply_text("⚠️ No registered users found in the database.")
        return

    status_msg = await message.reply_text(
        f"📢 <b>Starting Broadcast...</b>\n\n"
        f"• 👥 Total Recipients: <code>{total_users}</code>\n"
        f"• ⏳ Status: Initializing dispatch..."
    )

    success_count = 0
    blocked_count = 0
    failed_count = 0
    start_time = time.time()

    for idx, uid in enumerate(user_ids, start=1):
        try:
            if has_reply:
                await message.reply_to_message.copy(chat_id=uid)
            else:
                await client.send_message(chat_id=uid, text=broadcast_text)
            success_count += 1
        except FloodWait as fw:
            await asyncio.sleep(fw.value)
            try:
                if has_reply:
                    await message.reply_to_message.copy(chat_id=uid)
                else:
                    await client.send_message(chat_id=uid, text=broadcast_text)
                success_count += 1
            except Exception:
                failed_count += 1
        except (UserIsBlocked, InputUserDeactivated):
            blocked_count += 1
        except (PeerIdInvalid, Exception):
            failed_count += 1

        # Periodic live status update every 25 users
        if idx % 25 == 0 or idx == total_users:
            elapsed = max(1, int(time.time() - start_time))
            try:
                await status_msg.edit_text(
                    f"📢 <b>Broadcasting in Progress...</b>\n\n"
                    f"• 👥 Progress: <code>{idx}/{total_users}</code> ({int((idx/total_users)*100)}%)\n"
                    f"• ✅ Delivered: <code>{success_count}</code>\n"
                    f"• 🚫 Blocked/Deleted: <code>{blocked_count}</code>\n"
                    f"• ⚠️ Failed: <code>{failed_count}</code>\n"
                    f"• ⏱️ Elapsed: <code>{elapsed}s</code>"
                )
            except Exception:
                pass

        await asyncio.sleep(0.04)  # Safe delay to prevent Telegram flood limits

    total_time = round(time.time() - start_time, 1)

    summary_text = (
        f"✅ <b>Broadcast Completed Successfully!</b>\n\n"
        f"• 👤 <b>Dispatched By:</b> Admin {message.from_user.mention} (<code>{message.from_user.id}</code>)\n"
        f"• 👥 <b>Total Targets:</b> <code>{total_users}</code>\n"
        f"• ✅ <b>Successfully Delivered:</b> <code>{success_count}</code>\n"
        f"• 🚫 <b>Blocked/Deactivated:</b> <code>{blocked_count}</code>\n"
        f"• ⚠️ <b>Failed:</b> <code>{failed_count}</code>\n"
        f"• ⏱️ <b>Total Time Taken:</b> <code>{total_time}s</code>"
    )

    try:
        await status_msg.edit_text(summary_text)
    except Exception:
        await message.reply_text(summary_text)

    # Log to Central Activity Logger Group
    asyncio.create_task(send_group_log(
        client,
        LOG_GROUP_ID,
        f"📢 <b>Admin Broadcast Dispatched (Activity Logger Group)</b>\n\n"
        f"• <b>Admin:</b> {html.escape(message.from_user.first_name or '')} (<code>{message.from_user.id}</code>)\n"
        f"• <b>Recipients:</b> <code>{success_count}/{total_users}</code>\n"
        f"• <b>Blocked:</b> <code>{blocked_count}</code>\n"
        f"• <b>Duration:</b> <code>{total_time}s</code>\n"
        f"• <b>Content:</b> <i>{'[Forwarded Media Message]' if has_reply else broadcast_text[:120]}</i>"
    ))

# -------------------------------------------------------------
# Command: /plan & Dynamic 10-Minute UPI QR
# -------------------------------------------------------------
@app.on_message(filters.command("plan") & filters.private)
async def plans_handler(client: Client, message: Message):
    plan_text = (
        "💎 <b>Beta Bot Hub Premium Subscription Plans</b>\n\n"
        "1. <b>Free Tier:</b>\n"
        "• 3 Video Downloads & 3 Uploads daily\n"
        "• 100% Free forever\n\n"
        "2. <b>Pro Plan:</b>\n"
        "• 17 Downloads & 15 Uploads daily\n"
        "• 7 Days: <b>₹15</b> | 30 Days: <b>₹27</b>\n"
        "• High speed CDN direct delivery\n\n"
        "3. <b>Beta VIP Plan:</b>\n"
        "• <b>UNLIMITED</b> Downloads & Uploads!\n"
        "• 30 Days: <b>₹69</b>\n"
        "• Priority direct video files & turbo streaming\n\n"
        "⚡ <i>Select a plan below to get a <b>10-minute UPI QR</b> (payment is verified automatically):</i>"
    )
    kb = get_plans_keyboard()
    await message.reply_text(plan_text, reply_markup=kb)

# -------------------------------------------------------------
# Plans keyboard (2 rows layout, 1 plan per row = clean on mobile)
# -------------------------------------------------------------
def get_plans_keyboard():
    rows = []
    for key, p in PLANS.items():
        if p.get("price", 0) <= 0:
            continue
        icon = "🥇" if key.startswith("beta") else "🥈"
        rows.append([InlineKeyboardButton(f"{icon} {p['name']} • ₹{p['price']}", callback_data=f"buy_{key}")])
    rows.append([InlineKeyboardButton("🔙 Back to Menu", callback_data="btn_back_home")])
    return InlineKeyboardMarkup(rows)


# order_id -> {"user_id", "plan_key", "chat_id", "message_id", "expires_at", "done"}
PENDING_ORDERS = {}
ORDERS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "pending_orders.json")


def save_orders():
    try:
        live = {k: v for k, v in PENDING_ORDERS.items() if not v.get("done")}
        tmp = ORDERS_FILE + ".tmp"
        with open(tmp, "w") as f:
            json.dump(live, f)
        os.replace(tmp, ORDERS_FILE)
    except Exception as e:
        logger.error(f"Could not save pending orders: {e}")


def load_orders():
    try:
        with open(ORDERS_FILE) as f:
            return json.load(f)
    except FileNotFoundError:
        return {}
    except Exception as e:
        logger.error(f"Could not load pending orders: {e}")
        return {}


async def resume_pending_orders(client: Client):
    """After restart, keeps checking QRs that were still waiting for payment."""
    orders = load_orders()
    for oid, o in orders.items():
        if o.get("done"):
            continue
        PENDING_ORDERS[oid] = o
        ACTIVE_ORDER_BY_USER[o["user_id"]] = oid
        asyncio.create_task(watch_payment(client, oid))
    if orders:
        logger.info(f"🔁 Resumed {len(orders)} pending payment(s)")
# one active QR per user (stops spam)
ACTIVE_ORDER_BY_USER = {}


def _order_buttons(order_id: str, pay_url: str = None):
    rows = []
    if pay_url:
        rows.append([InlineKeyboardButton("💳 Pay Now (Open UPI Page)", url=pay_url)])
    rows.append([InlineKeyboardButton("🔄 Check Payment Status", callback_data=f"chk_{order_id}")])
    rows.append([
        InlineKeyboardButton("❌ Cancel", callback_data=f"cxl_{order_id}"),
        InlineKeyboardButton("💎 Plans", callback_data="btn_plans"),
    ])
    return InlineKeyboardMarkup(rows)


async def activate_paid_order(client: Client, order_id: str):
    """Activates the plan exactly once for a PAID order."""
    order = PENDING_ORDERS.get(order_id)
    if not order or order["done"]:
        return
    order["done"] = True
    ACTIVE_ORDER_BY_USER.pop(order["user_id"], None)
    save_orders()

    plan = PLANS[order["plan_key"]]
    db_plan = "beta" if order["plan_key"].startswith("beta") else "pro"
    info = await db.grant_premium(
        user_id=order["user_id"], plan=db_plan, days=plan["days"], granted_by=0
    )

    text = (
        "🎉 <b>Payment Received & Verified!</b>\n\n"
        f"📦 <b>Plan:</b> {plan['name']}\n"
        f"💰 <b>Paid:</b> ₹{order['pay_amount']}\n"
        f"🧾 <b>Order ID:</b> <code>{order_id}</code>\n"
        f"📅 <b>Valid Till:</b> <code>{info.get('expires_at')}</code>\n\n"
        "✅ Your premium plan is now <b>ACTIVE</b>. Enjoy!"
    )
    kb = InlineKeyboardMarkup([[InlineKeyboardButton("🏠 Main Menu", callback_data="btn_back_home")]])
    try:
        await client.delete_messages(order["chat_id"], order["message_id"])  # remove paid QR
    except Exception:
        pass
    try:
        await client.send_message(order["chat_id"], text, reply_markup=kb)
    except Exception as e:
        logger.error(f"Could not notify user about payment {order_id}: {e}")

    asyncio.create_task(send_group_log(
        client, PAYMENT_LOG_GROUP_ID,
        "✅ <b>Payment PAID (Auto-Verified)</b>\n\n"
        f"• <b>User ID:</b> <code>{order['user_id']}</code>\n"
        f"• <b>Plan:</b> {plan['name']}\n"
        f"• <b>Amount:</b> ₹{order['pay_amount']}\n"
        f"• <b>Order ID:</b> <code>{order_id}</code>\n"
        f"• <b>Valid Till:</b> <code>{info.get('expires_at')}</code>\n"
        f"• <b>Time:</b> <code>{_now_str()}</code>"
    ))


async def expire_order(client: Client, order_id: str, reason: str = "expired"):
    order = PENDING_ORDERS.get(order_id)
    if not order or order["done"]:
        return
    order["done"] = True
    ACTIVE_ORDER_BY_USER.pop(order["user_id"], None)
    save_orders()
    title = "❌ <b>Payment Cancelled</b>" if reason == "cancelled" else f"⏱️ <b>QR Expired ({QR_EXPIRY_MINUTES} Minutes Over)</b>"
    text = (
        f"{title}\n\n"
        f"🧾 Order: <code>{order_id}</code>\n\n"
        "⚠️ Please <b>do not pay</b> on this QR anymore.\n"
        "Tap the button below to generate a new QR."
    )
    kb = InlineKeyboardMarkup([[InlineKeyboardButton("🔄 Generate New QR", callback_data="btn_plans")]])
    try:
        await client.delete_messages(order["chat_id"], order["message_id"])  # QR auto-delete
    except Exception as e:
        logger.warning(f"Could not delete QR: {e}")
    try:
        await client.send_message(order["chat_id"], text, reply_markup=kb)
    except Exception as e:
        logger.warning(f"Could not send QR expired notice: {e}")
    asyncio.create_task(send_group_log(
        client, PAYMENT_LOG_GROUP_ID,
        f"{'❌ <b>Payment Cancelled</b>' if reason == 'cancelled' else '⏱️ <b>QR Expired (Unpaid)</b>'}\n\n"
        f"• <b>User ID:</b> <code>{order['user_id']}</code>\n"
        f"• <b>Plan:</b> {PLANS.get(order['plan_key'], {}).get('name', order['plan_key'])}\n"
        f"• <b>Amount:</b> ₹{order['pay_amount']}\n"
        f"• <b>Order ID:</b> <code>{order_id}</code>\n"
        f"• <b>Time:</b> <code>{_now_str()}</code>"
    ))


async def watch_payment(client: Client, order_id: str):
    """Polls the gateway every PAYMENT_POLL_SECONDS until PAID or 10 minutes pass."""
    while True:
        order = PENDING_ORDERS.get(order_id)
        if not order or order["done"]:
            return
        if time.time() >= order["expires_at"]:
            # last check before expiring, in case the payment landed at the last second
            if await gateway.status(order_id) == "PAID":
                await activate_paid_order(client, order_id)
            else:
                await expire_order(client, order_id)
            return
        try:
            status = await gateway.status(order_id)
        except Exception as e:
            logger.warning(f"Gateway status error {order_id}: {e}")
            status = "PENDING"
        if status == "PAID":
            await activate_paid_order(client, order_id)
            return
        if status == "EXPIRED":
            await expire_order(client, order_id)
            return
        await asyncio.sleep(PAYMENT_POLL_SECONDS)


# -------------------------------------------------------------
# Callback: buy_<plan_key>  ->  create order on gateway + send 10-min QR
# -------------------------------------------------------------
@app.on_callback_query(filters.regex(r"^buy_([a-z0-9_]+)$"))
async def generate_upi_qr_callback(client: Client, query: CallbackQuery):
    plan_key = query.matches[0].group(1)
    plan = PLANS.get(plan_key)
    if not plan or plan.get("price", 0) <= 0:
        await query.answer("❌ Plan not found", show_alert=True)
        return

    user_id = query.from_user.id
    old = ACTIVE_ORDER_BY_USER.get(user_id)
    if old and old in PENDING_ORDERS and not PENDING_ORDERS[old]["done"]:
        await query.answer("⚠️ You already have an active QR. Pay it or cancel it first.", show_alert=True)
        return

    await query.answer("⏳ Generating your QR...")
    wait_msg = await client.send_message(query.message.chat.id, "⏳ <b>Creating secure payment QR...</b>")

    try:
        order = await gateway.create(
            amount=plan["price"],
            note=f"BBH {plan['name']} uid:{user_id}",
            customer_email=f"tg{user_id}@{PAYMENT_EMAIL_DOMAIN}",
        )
    except PaymentError as e:
        logger.error(f"Gateway create failed: {e}")
        await wait_msg.edit_text(
            "❌ <b>Could not generate the payment QR right now.</b>\nPlease try again later or contact support.",
            reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("🔄 Try Again", callback_data=f"buy_{plan_key}")]])
        )
        asyncio.create_task(send_group_log(client, PAYMENT_LOG_GROUP_ID,
            f"⚠️ <b>Gateway Error</b>\n• User: <code>{user_id}</code>\n• <code>{html.escape(str(e))[:300]}</code>"))
        return

    order_id = order["order_id"]
    pay_amount = order["pay_amount"]
    expiry_str = (datetime.datetime.now() + datetime.timedelta(minutes=QR_EXPIRY_MINUTES)).strftime("%I:%M %p")

    # QR image: gateway image first, else build it locally from the UPI link
    photo = None
    if order.get("qr_image_url"):
        raw = await gateway.fetch_qr_bytes(order["qr_image_url"])
        if raw:
            photo = io.BytesIO(raw)
    if photo is None and order.get("upi_uri"):
        img = qrcode.make(order["upi_uri"])
        photo = io.BytesIO()
        img.save(photo, "PNG")
    if photo is None:
        await wait_msg.edit_text("❌ QR not available from gateway. Please try again.")
        return
    photo.name = f"qr_{order_id}.png"
    photo.seek(0)

    caption = (
        "💳 <b>BETA BOT HUB • UPI Payment</b>\n\n"
        f"📦 <b>Plan:</b> {plan['name']}\n"
        f"💰 <b>Pay Exactly:</b> <code>₹{pay_amount}</code>\n"
        f"🧾 <b>Order ID:</b> <code>{order_id}</code>\n"
        f"⏰ <b>Valid For:</b> {QR_EXPIRY_MINUTES} minutes (till <code>{expiry_str}</code>)\n\n"
        "<b>Kaise Pay Karein:</b>\n"
        "1️⃣ Scan the QR with PhonePe / GPay / Paytm / FamPay\n"
        f"2️⃣ Pay the <b>exact amount ₹{pay_amount}</b> (including paise)\n"
        "3️⃣ Done! Payment is <b>verified automatically</b> and your plan activates instantly ✅\n\n"
        "<i>No need to send a screenshot or UTR.</i>"
    )

    sent = await client.send_photo(
        chat_id=query.message.chat.id,
        photo=photo,
        caption=caption,
        reply_markup=_order_buttons(order_id, order.get("pay_url")),
    )
    try:
        await wait_msg.delete()
    except Exception:
        pass

    PENDING_ORDERS[order_id] = {
        "user_id": user_id,
        "plan_key": plan_key,
        "chat_id": sent.chat.id,
        "message_id": sent.id,
        "pay_amount": pay_amount,
        "expires_at": time.time() + QR_EXPIRY_MINUTES * 60,
        "done": False,
    }
    ACTIVE_ORDER_BY_USER[user_id] = order_id
    save_orders()
    asyncio.create_task(watch_payment(client, order_id))

    asyncio.create_task(send_group_log(
        client, PAYMENT_LOG_GROUP_ID,
        "💳 <b>New Payment QR Created</b>\n\n"
        f"• <b>User:</b> {html.escape(query.from_user.first_name or '')} (@{query.from_user.username or 'NoUsername'})\n"
        f"• <b>User ID:</b> <code>{user_id}</code>\n"
        f"• <b>Plan:</b> {plan['name']}\n"
        f"• <b>Amount:</b> ₹{pay_amount}\n"
        f"• <b>Order ID:</b> <code>{order_id}</code>\n"
        f"• <b>Expires:</b> <code>{expiry_str}</code>"
    ))


@app.on_callback_query(filters.regex(r"^chk_(.+)$"))
async def check_payment_callback(client: Client, query: CallbackQuery):
    order_id = query.matches[0].group(1)
    order = PENDING_ORDERS.get(order_id)
    if not order or order["user_id"] != query.from_user.id:
        await query.answer("❌ Order not found.", show_alert=True)
        return
    if order["done"]:
        await query.answer("ℹ️ This order is already completed / expired.", show_alert=True)
        return
    status = await gateway.status(order_id)
    if status == "PAID":
        await query.answer("✅ Payment received!")
        await activate_paid_order(client, order_id)
    elif status == "EXPIRED":
        await query.answer("⏱️ QR expired.", show_alert=True)
        await expire_order(client, order_id)
    else:
        left = max(0, int(order["expires_at"] - time.time()))
        await query.answer(f"⏳ Payment not received yet. QR is valid for {left // 60}m {left % 60}s more.", show_alert=True)


@app.on_callback_query(filters.regex(r"^cxl_(.+)$"))
async def cancel_payment_callback(client: Client, query: CallbackQuery):
    order_id = query.matches[0].group(1)
    order = PENDING_ORDERS.get(order_id)
    if not order or order["user_id"] != query.from_user.id:
        await query.answer("❌ Order not found.", show_alert=True)
        return
    await expire_order(client, order_id, reason="cancelled")
    await query.answer("Order cancelled.")

# -------------------------------------------------------------
# Callback Query: Plans & Renew Now Flow
# -------------------------------------------------------------
@app.on_callback_query(filters.regex(r"^(btn_plans|btn_renew)$"))
async def plans_and_renew_callback(client: Client, query: CallbackQuery):
    is_renew = query.data == "btn_renew"
    title_text = "🔄 <b>Renew Your Premium Subscription</b>" if is_renew else "💎 <b>Beta Bot Hub Premium Plans & Upgrades</b>"
    
    plan_text = (
        f"{title_text}\n\n"
        "1. <b>Free Tier:</b>\n"
        "• 3 Video Downloads & 3 Uploads daily\n"
        "• 100% Free forever\n\n"
        "2. <b>Pro Plan:</b>\n"
        "• 17 Downloads & 15 Uploads daily\n"
        "• 7 Days: <b>₹15</b> | 30 Days: <b>₹27</b>\n"
        "• High speed CDN direct delivery\n\n"
        "3. <b>Beta VIP Plan:</b>\n"
        "• <b>UNLIMITED</b> Downloads & Uploads!\n"
        "• 30 Days: <b>₹69</b>\n"
        "• Priority direct video files & turbo streaming\n\n"
        "⚡ <i>Select a plan below to get a <b>10-minute UPI QR</b> (payment is verified automatically):</i>"
    )
    kb = get_plans_keyboard()
    try:
        await query.message.edit_text(plan_text, reply_markup=kb)
    except Exception:
        await client.send_message(query.message.chat.id, plan_text, reply_markup=kb)
    await query.answer()

@app.on_callback_query(filters.regex(r"^btn_back_home$"))
async def back_home_callback(client: Client, query: CallbackQuery):
    user_id = query.from_user.id
    user_info = await db.get_user_full_info(user_id)
    plan_str = user_info.get('plan', 'free').upper() if user_info else 'FREE'
    welcome_text = (
        f"⚡ <b>Welcome back to Beta Bot Hub!</b> ⚡\n\n"
        f"I am your lightning-fast media downloader and cloud engine.\n\n"
        f"• 👤 <b>User ID:</b> <code>{user_id}</code>\n"
        f"• 💎 <b>Current Tier:</b> <b>{plan_str}</b>\n"
        f"• 📥 <b>Daily Downloads:</b> <code>{user_info.get('downloads_today', 0) if user_info else 0}</code>\n"
        f"• 📤 <b>Daily Uploads:</b> <code>{user_info.get('uploads_today', 0) if user_info else 0}</code>\n\n"
        f"<i>Paste any TeraBox link to start downloading!</i>"
    )
    try:
        if query.message.photo:
            await query.message.edit_caption(welcome_text, reply_markup=get_stylish_main_keyboard())
        else:
            await query.message.edit_text(welcome_text, reply_markup=get_stylish_main_keyboard())
    except Exception:
        await client.send_message(query.message.chat.id, welcome_text, reply_markup=get_stylish_main_keyboard())
    await query.answer()

@app.on_callback_query(filters.regex(r"^btn_download$"))
async def btn_download_callback(client: Client, query: CallbackQuery):
    await query.message.reply_text(
        f"📥 <b>How to Download:</b>\n\n"
        "Just paste any <b>TeraBox</b> video / file link directly in this chat!\n"
        "• Example: <code>https://teraboxapp.com/s/...</code>\n\n"
        f"⚡ <i>The bot will send the video (up to 2 GB) with <b>Watch Now</b> &amp; <b>Download Now</b> buttons. "
        f"Files up to {MAX_DOWNLOAD_GB} GB are supported. Auto-delete: {MEDIA_AUTO_DELETE_MINUTES} min.</i>"
    )
    await query.answer()

@app.on_callback_query(filters.regex(r"^btn_upload$"))
async def btn_upload_callback(client: Client, query: CallbackQuery):
    await query.message.reply_text(
        "📤 <b>How to Upload (PlayMast Cloud):</b>\n\n"
        "Send any video, audio, photo, or document directly to this bot chat.\n"
        "The bot will automatically upload it to PlayMast and provide a public shareable cloud link!"
    )
    await query.answer()

@app.on_callback_query(filters.regex(r"^btn_referral$"))
async def btn_referral_callback(client: Client, query: CallbackQuery):
    user_id = query.from_user.id
    verified_refs = await db.get_verified_referrals_count(user_id)
    me = await client.get_me()
    ref_link = f"https://t.me/{me.username}?start=ref_{user_id}"
    ref_text = (
        f"👥 <b>Refer & Earn Premium Access</b>\n\n"
        f"• <b>Rule:</b> Refer <b>3 Friends</b> = Get <b>1 Free Day Pro Pass</b>!\n"
        f"• <b>Verified Referrals:</b> <code>{verified_refs}/3</code>\n\n"
        f"🔗 <b>Your Exclusive Referral Link:</b>\n<code>{ref_link}</code>\n\n"
        f"<i>Share this link with your friends. Once they start the bot and join our official groups, your referral is credited!</i>"
    )
    kb = InlineKeyboardMarkup([
        [InlineKeyboardButton("💎 Buy VIP Plan", callback_data="btn_plans")],
        [InlineKeyboardButton("🔙 Back to Menu", callback_data="btn_back_home")]
    ])
    await query.message.reply_text(ref_text, reply_markup=kb)
    await query.answer()

@app.on_callback_query(filters.regex(r"^btn_my_stats$"))
async def btn_my_stats_callback(client: Client, query: CallbackQuery):
    user_id = query.from_user.id
    u = await db.get_user_full_info(user_id) or {}
    plan_name = u.get('plan', 'free').upper()
    stats_text = (
        f"📊 <b>Your Account & Usage Quota:</b>\n\n"
        f"• 🆔 <b>User ID:</b> <code>{user_id}</code>\n"
        f"• 💎 <b>Current Tier:</b> <b>{plan_name}</b>\n"
        f"• 📅 <b>Expiry:</b> <code>{u.get('plan_expires_at', 'Never (Free Tier)')}</code>\n"
        f"• 📥 <b>Downloads Today:</b> <code>{u.get('downloads_today', 0)}</code>\n"
        f"• 📤 <b>Uploads Today:</b> <code>{u.get('uploads_today', 0)}</code>\n"
        f"• 👥 <b>Referrals:</b> <code>{u.get('verified_referrals', 0)}</code>"
    )
    kb = InlineKeyboardMarkup([
        [InlineKeyboardButton("🔄 Renew / Upgrade Plan", callback_data="btn_renew")],
        [InlineKeyboardButton("🔙 Back to Menu", callback_data="btn_back_home")]
    ])
    await query.message.reply_text(stats_text, reply_markup=kb)
    await query.answer()

# -------------------------------------------------------------
# -------------------------------------------------------------
# Help (button + /help) and shortcut commands
# -------------------------------------------------------------
HELP_TEXT = (
    "❓ <b>Beta Bot Hub • Help & Guide</b>\n\n"
    "📥 <b>Download:</b> Paste a TeraBox link and the bot will send the video.\n"
    "📤 <b>Upload:</b> Send any file and get a PlayMast link.\n"
    "💎 <b>Premium:</b> Tap /plan → choose a plan → scan the QR and pay.\n"
    "    Payment is <b>auto-verified</b>, plan activates instantly.\n"
    "👥 <b>Refer:</b> 3 verified friends = 1 din free premium.\n\n"
    "<b>Commands:</b>\n"
    "/start • /plan • /stats • /referral • /help\n\n"
    f"⚠️ Delivered files are auto-deleted after {MEDIA_AUTO_DELETE_MINUTES} minutes."
)


@app.on_message(filters.command("help") & filters.private)
async def help_command(client: Client, message: Message):
    await message.reply_text(HELP_TEXT, reply_markup=InlineKeyboardMarkup([
        [InlineKeyboardButton("💎 Plans", callback_data="btn_plans"),
         InlineKeyboardButton("🏠 Menu", callback_data="btn_back_home")]
    ]))


@app.on_callback_query(filters.regex(r"^btn_help$"))
async def btn_help_callback(client: Client, query: CallbackQuery):
    await query.message.reply_text(HELP_TEXT, reply_markup=InlineKeyboardMarkup([
        [InlineKeyboardButton("💎 Plans", callback_data="btn_plans"),
         InlineKeyboardButton("🏠 Menu", callback_data="btn_back_home")]
    ]))
    await query.answer()


@app.on_message(filters.command(["stats", "referral"]) & filters.private)
async def shortcut_commands(client: Client, message: Message):
    # Reuse the button handlers by faking a minimal query-like flow
    if message.command[0] == "stats":
        u = await db.get_user_full_info(message.from_user.id) or {}
        await message.reply_text(
            f"📊 <b>Your Stats</b>\n\n"
            f"• 💎 Plan: <b>{u.get('plan', 'free').upper()}</b>\n"
            f"• 📅 Expiry: <code>{u.get('plan_expires_at') or 'Never (Free)'}</code>\n"
            f"• 📥 Downloads Today: <code>{u.get('downloads_today', 0)}</code>\n"
            f"• 📤 Uploads Today: <code>{u.get('uploads_today', 0)}</code>",
            reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("🔄 Upgrade Plan", callback_data="btn_renew")]])
        )
    else:
        me = await client.get_me()
        refs = await db.get_verified_referrals_count(message.from_user.id)
        await message.reply_text(
            f"👥 <b>Refer & Earn</b>\n\nVerified: <code>{refs}/3</code>\n"
            f"🔗 <code>https://t.me/{me.username}?start=ref_{message.from_user.id}</code>"
        )


# -------------------------------------------------------------
# Handler: TeraBox link -> direct video
# -------------------------------------------------------------
TERABOX_DOMAINS = ["terabox", "1024tera", "terasharelink", "freeterabox", "mirrobox", "nephobox",
                   "4funbox", "teraboxlink", "momerybox", "tibibox", "teraboxapp", "terafileshare"]


DL_HEADERS = {"User-Agent": "Mozilla/5.0", "Referer": "https://www.terabox.com/"}
DL_PARTS = 8  # parallel connections per file (faster on slow servers)


async def _fetch_range(s, url, path, start, end, counter):
    for attempt in range(4):
        pos = start + counter.get(start, 0)
        if pos > end:
            return
        try:
            async with s.get(url, headers={**DL_HEADERS, "Range": f"bytes={pos}-{end}"}) as r:
                if r.status != 206:
                    raise TeraBoxError(f"range error {r.status}")
                with open(path, "r+b") as f:
                    f.seek(pos)
                    async for chunk in r.content.iter_chunked(1024 * 1024):
                        f.write(chunk)
                        counter[start] = counter.get(start, 0) + len(chunk)
            if start + counter.get(start, 0) > end:
                return
        except TeraBoxError:
            raise
        except Exception as e:
            logger.info(f"part {start} retry {attempt + 1}: {e}")
            await asyncio.sleep(2)
    raise TeraBoxError("Download stopped midway, please try again")


async def _download_to_temp(url: str, max_bytes: int, size_hint: int = 0, progress=None) -> str:
    """Downloads with several parallel connections when the server allows it."""
    fd, path = tempfile.mkstemp(suffix=".mp4")
    os.close(fd)
    timeout = aiohttp.ClientTimeout(total=None, sock_connect=30, sock_read=120)
    try:
        async with aiohttp.ClientSession(timeout=timeout) as s:
            size = 0
            async with s.get(url, headers={**DL_HEADERS, "Range": "bytes=0-0"}) as r:
                if r.status == 206 and "/" in r.headers.get("Content-Range", ""):
                    size = int(r.headers["Content-Range"].split("/")[-1])
            if size and size > max_bytes:
                raise TeraBoxError("File is too large")
            if size > 5 * 1024 * 1024:
                with open(path, "wb") as f:
                    f.truncate(size)
                part = -(-size // DL_PARTS)
                counter = {}

                async def _reporter():
                    while True:
                        await asyncio.sleep(1)
                        if progress:
                            await progress(sum(counter.values()), size)

                rep = asyncio.create_task(_reporter())
                try:
                    await asyncio.gather(*[
                        _fetch_range(s, url, path, i, min(i + part - 1, size - 1), counter)
                        for i in range(0, size, part)
                    ])
                finally:
                    rep.cancel()
                if progress:
                    await progress(size, size)
                return path
            # fallback: single connection
            got = 0
            async with s.get(url, headers=DL_HEADERS) as r:
                total_len = int(r.headers.get("Content-Length") or size_hint or 0)
                if r.status != 200:
                    raise TeraBoxError(f"Download server error {r.status}")
                with open(path, "wb") as f:
                    async for chunk in r.content.iter_chunked(1024 * 1024):
                        got += len(chunk)
                        if got > max_bytes:
                            raise TeraBoxError("File is too large")
                        f.write(chunk)
                        if progress:
                            await progress(got, total_len)
        return path
    except Exception:
        if os.path.exists(path):
            os.remove(path)
        raise


@app.on_message(filters.text & filters.private & ~filters.regex(r"^/"))
async def direct_video_processor(client: Client, message: Message):
    url = message.text.strip()
    user_id = message.from_user.id
    user_tag = f"{html.escape(message.from_user.first_name or '')} (@{message.from_user.username or 'NoUsername'})"

    if not any(d in url.lower() for d in TERABOX_DOMAINS):
        await message.reply_text("❌ Please send a valid <b>TeraBox</b> link!\n\nExample: <code>https://teraboxapp.com/s/...</code>")
        return

    # 1) Must Join check
    if not await force_join_gate(client, message):
        return
    if user_id in BUSY_USERS:
        await message.reply_text("⏳ Your previous file is still processing. Please wait for it to finish.", quote=True)
        return

    # 2) Quota check
    can_download, left = await db.can_download(user_id)
    if not can_download:
        await message.reply_text(
            f"⚠️ <b>Daily Download Limit Reached!</b>\n\n"
            f"You have used all your download requests for today.\n"
            f"Upgrade to <b>Pro</b> or <b>Beta VIP</b>, or refer 3 friends for a 1-day pass!",
            reply_markup=InlineKeyboardMarkup([
                [InlineKeyboardButton("💎 Upgrade Plan", callback_data="btn_plans")],
                [InlineKeyboardButton("👥 Refer 3 Friends", callback_data="btn_referral")]
            ])
        )
        return

    BUSY_USERS.add(user_id)
    try:
        if _job_slots().locked():
            await message.reply_text("🚦 Many users are downloading right now, you are in the queue — please wait...", quote=True)
        async with _job_slots():
            await _process_download(client, message, url, user_id, user_tag)
    finally:
        BUSY_USERS.discard(user_id)


def _action_keyboard(links, with_join=True):
    """Watch Now / Download Now buttons. They point to YOUR server (BASE_URL/watch/<token>),
    never to the TeraBox API, so the API address stays hidden."""
    rows = []
    if links:
        rows.append([
            InlineKeyboardButton("▶️ Watch Now", url=links["watch"]),
            InlineKeyboardButton("⬇️ Download Now", url=links["download"]),
        ])
    if with_join:
        rows.append([InlineKeyboardButton("📢 Join Bot Updates", url=_chat_link(UPDATES_CHANNEL))])
    return InlineKeyboardMarkup(rows)


async def _process_download(client, message, url, user_id, user_tag):
    status_msg = await message.reply_text("🔎 <b>Checking your link...</b>", quote=True)
    file_path = None
    thumb_path = None
    t_start = time.time()
    try:
        media_info = await terabox.extract(url)
        title = html.escape(media_info['title'])
        size_bytes = int(media_info.get('size_bytes') or 0)
        size_txt = media_info.get('size', 'N/A')

        # Private tokenised links (API + CDN address stay hidden on the server)
        links = create_links(media_info, user_id) if web_enabled() else None
        kb = _action_keyboard(links)

        await status_msg.edit_text(
            f"✅ <b>Link verified</b>\n\n🎬 <code>{title}</code>\n📦 <code>{size_txt}</code>\n\n⏳ <i>Preparing...</i>")

        if media_info.get('thumbnail_url') and isinstance(media_info['thumbnail_url'], str):
            try:
                thumb_path = await stamp_watermark(media_info['thumbnail_url'], WATERMARK_TEXT)
            except Exception as e:
                logger.info(f"Thumbnail watermark skipped: {scrub(e)}")

        caption = (
            f"🎬 <b>{title}</b>\n\n"
            f"📦 <b>Size:</b> <code>{size_txt}</code>\n"
            f"🏷️ <b>By:</b> <code>{WATERMARK_TEXT}</code>"
        )

        # ---- decide how to deliver -------------------------------------------------
        send_limit = MAX_SEND_MB * 1024 * 1024
        over_max = size_bytes > MAX_DOWNLOAD_BYTES            # > 2.99 GB
        over_tg = size_bytes > send_limit                     # > Telegram 2 GB chat limit
        sent_media_msg = None
        note = ""

        if over_max:
            note = (
                f"\n\n🚫 <b>Too large for chat!</b>\n"
                f"This file is <code>{size_txt}</code>, above the <b>{MAX_DOWNLOAD_GB} GB</b> limit, so the video "
                f"will <b>not</b> be sent here. Use <b>Watch Now</b> or <b>Download Now</b> below."
            )
        elif over_tg:
            note = (
                f"\n\nℹ️ <b>Large file</b> — Telegram cannot send files above 2 GB in chat. "
                f"Use <b>Watch Now</b> or <b>Download Now</b> below."
            )
        else:
            try:
                file_path = await _download_to_temp(
                    media_info['download_url'], send_limit, size_bytes,
                    progress=ThrottledProgress(status_msg, f"⬇️ <b>Downloading from TeraBox...</b>\n🎬 <code>{title}</code>"))
                dl_time = time.time() - t_start
                await status_msg.edit_text(f"⬆️ <b>Uploading to Telegram...</b>\n\n🎬 <code>{title}</code>")
                sent_media_msg = await client.send_video(
                    chat_id=message.chat.id,
                    video=file_path,
                    caption=caption + f"\n⏱️ <b>Ready in:</b> <code>{fmt_time(time.time() - t_start)}</code>",
                    thumb=thumb_path if thumb_path and os.path.exists(thumb_path) else None,
                    supports_streaming=True,
                    file_name=media_info['title'],
                    reply_markup=kb,
                    progress=ThrottledProgress(status_msg, f"⬆️ <b>Uploading to Telegram...</b>\n🎬 <code>{title}</code>"),
                )
            except Exception as send_err:
                logger.info(f"Direct video send failed, sending buttons instead: {scrub(send_err)}")
                sent_media_msg = None
                note = ("\n\nℹ️ <i>The video could not be sent in chat — use <b>Watch Now</b> or "
                        "<b>Download Now</b> below.</i>")

        if sent_media_msg is None:
            if not links:
                note += "\n\n⚠️ <i>Watch / Download buttons are not configured on this server (BASE_URL missing). Contact the owner.</i>"
            if thumb_path and os.path.exists(thumb_path):
                sent_media_msg = await message.reply_photo(photo=thumb_path, caption=caption + note, reply_markup=kb)
            else:
                sent_media_msg = await message.reply_text(caption + note, reply_markup=kb, disable_web_page_preview=True)

        # 3) Delete-time warning (separate message, deleted together with the file)
        warn_msg = await sent_media_msg.reply_text(
            f"⚠️ <b>WARNING!</b>\n\n"
            f"This file will be automatically <b>deleted</b> in <b>{MEDIA_AUTO_DELETE_MINUTES} minutes</b>. 🗑️\n"
            f"<b>Save</b> it now or forward it to <b>Saved Messages</b>.",
            quote=True,
        )

        await db.record_download(user_id)
        try:
            await status_msg.delete()
        except Exception:
            pass

        sent_as = "Video in chat" if getattr(sent_media_msg, "video", None) else (
            "Buttons only (over 2.99 GB)" if over_max else "Buttons only")
        asyncio.create_task(send_group_log(
            client, DATA_LOG_GROUP_ID,
            f"📥 <b>Download Log</b>\n\n"
            f"• <b>File:</b> {title}\n"
            f"• <b>Size:</b> <code>{size_txt}</code>\n"
            f"• <b>Sent As:</b> <code>{sent_as}</code>\n"
            f"• <b>User:</b> {user_tag}\n"
            f"• <b>User ID:</b> <code>{user_id}</code>\n"
            f"• <b>Link:</b> <code>{html.escape(url[:100])}</code>\n"
            f"• <b>Time:</b> <code>{_now_str()}</code>"
        ))

        asyncio.create_task(schedule_media_autodelete(
            client=client,
            chat_id=message.chat.id,
            message_id=[sent_media_msg.id, warn_msg.id],
            delay_seconds=MEDIA_AUTO_DELETE_MINUTES * 60
        ))

    except Exception as e:
        logger.error(f"Download failed for {user_id}: {scrub(e)}")
        reason = scrub(str(e)) if isinstance(e, TeraBoxError) else "Server is busy, please try again later"
        try:
            await status_msg.edit_text(f"❌ <b>Could not fetch the video</b>\n\n<i>{html.escape(reason)}</i>\nThe link must be public and active.")
        except Exception:
            pass
        asyncio.create_task(send_group_log(
            client, DATA_LOG_GROUP_ID,
            f"⚠️ <b>Download Failed</b>\n\n"
            f"• <b>User:</b> {user_tag} (<code>{user_id}</code>)\n"
            f"• <b>Link:</b> <code>{html.escape(url[:100])}</code>\n"
            f"• <b>Error:</b> <code>{html.escape(scrub(str(e)))[:300]}</code>\n"
            f"• <b>Time:</b> <code>{_now_str()}</code>"
        ))
    finally:
        for pth in (file_path, thumb_path):
            if pth and os.path.exists(pth):
                try:
                    os.remove(pth)
                except Exception:
                    pass

# -------------------------------------------------------------
# Handler: Upload File to Generate TeraBox Link & Auto-Delete
# -------------------------------------------------------------
@app.on_message((filters.video | filters.audio | filters.photo | filters.document) & filters.private)
async def file_uploader(client: Client, message: Message):
    user_id = message.from_user.id
    if not await force_join_gate(client, message):
        return
    media = message.video or message.document or message.audio or message.photo
    fsize = getattr(media, "file_size", 0) or 0
    if fsize > MAX_UPLOAD_MB * 1024 * 1024:
        await message.reply_text(
            f"❌ <b>File is too large</b>\n\nMax upload size is <b>{MAX_UPLOAD_MB / 1024:.2f} GB</b> "
            f"(Telegram limit). Your file: <code>{fmt_size(fsize)}</code>.", quote=True)
        return
    if user_id in BUSY_USERS:
        await message.reply_text("⏳ Your previous file is still processing. Please wait for it to finish.", quote=True)
        return
    can_upload, left = await db.can_upload(user_id)
    if not can_upload:
        await message.reply_text(
            "⚠️ <b>Daily Upload Limit Reached!</b>\n\n"
            "Upgrade to Pro or Beta VIP for higher quotas!",
            reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("💎 Upgrade", callback_data="btn_plans")]])
        )
        return

    status_msg = await message.reply_text("📤 <b>Preparing upload to PlayMast Cloud...</b>", quote=True)
    t_start = time.time()
    file_path = None
    BUSY_USERS.add(user_id)
    try:
        try:
            async with _job_slots():
                file_path = await message.download(progress=ThrottledProgress(
                    status_msg, f"📥 <b>Step 1/2 — Receiving your file</b>\n<code>{fmt_size(fsize)}</code>"))
            share_link = await terabox.upload_file(
                file_path, title=getattr(message, 'caption', None) or None,
                progress_callback=ThrottledProgress(status_msg, "☁️ <b>Step 2/2 — Uploading to PlayMast Cloud</b>"))
        finally:
            if file_path and os.path.exists(file_path):
                os.remove(file_path)
        await db.record_upload(user_id)

        # Send Upload Data to DATA_LOG_GROUP_ID (Data Log Group)
        asyncio.create_task(send_group_log(
            client,
            DATA_LOG_GROUP_ID,
            f"📤 <b>File Uploaded & Link Created (Data Log Group)</b>\n\n"
            f"• <b>Generated Link:</b> {share_link}\n"
            f"• <b>User:</b> {html.escape(message.from_user.first_name or '')} (@{message.from_user.username or 'NoUsername'})\n"
            f"• <b>User ID:</b> <code>{user_id}</code>\n"
            f"• <b>Watermark:</b> <code>{WATERMARK_TEXT}</code>\n"
            f"• <b>Time:</b> <code>{_now_str()}</code>"
        ))

        caption = (
            f"✅ <b>PlayMast Link Created Successfully!</b>\n\n"
            f"🔗 <b>Your Generated Link:</b>\n<code>{share_link}</code>\n\n"
            f"📦 <b>Size:</b> <code>{fmt_size(fsize)}</code>\n"
            f"⏱️ <b>Time taken:</b> <code>{fmt_time(time.time() - t_start)}</code>\n"
            f"🏷️ <b>By:</b> <code>{WATERMARK_TEXT}</code>\n\n"
            f"⚠️ <b>AUTO-DELETE NOTICE:</b> This confirmation will automatically delete in {MEDIA_AUTO_DELETE_MINUTES} minutes."
        )

        kb = InlineKeyboardMarkup([
            [InlineKeyboardButton("🔗 Open Link", url=share_link)],
            [InlineKeyboardButton("📤 Share Link", url=f"https://t.me/share/url?url={quote(share_link, safe='')}")]
        ])

        try:
            await status_msg.delete()
        except Exception:
            pass
        sent_msg = await send_rich_or_text(client, message.chat.id, caption,
                                           reply_markup=kb, reply_to_message_id=message.id)

        # auto-delete auto-delete for upload link
        asyncio.create_task(schedule_media_autodelete(
            client=client,
            chat_id=message.chat.id,
            message_id=sent_msg.id,
            delay_seconds=MEDIA_AUTO_DELETE_MINUTES * 60
        ))

    except Exception as e:
        logger.error(f"Upload failed for {user_id}: {scrub(e)}")
        try:
            await status_msg.edit_text(f"❌ <b>Upload failed</b>\n\n<i>{html.escape(scrub(str(e)))}</i>")
        except Exception:
            pass
        asyncio.create_task(send_group_log(
            client, DATA_LOG_GROUP_ID,
            f"⚠️ <b>Upload Failed</b>\n\n"
            f"• <b>User:</b> {html.escape(message.from_user.first_name or '')} (<code>{user_id}</code>)\n"
            f"• <b>Error:</b> <code>{html.escape(scrub(str(e)))[:300]}</code>\n"
            f"• <b>Time:</b> <code>{_now_str()}</code>"
        ))
    finally:
        BUSY_USERS.discard(user_id)

# -------------------------------------------------------------
# Background Task: Premium Subscription Expiry Watcher & Auto-Renewal Alert
# -------------------------------------------------------------
async def schedule_subscription_expiry_watcher(client: Client, check_interval_seconds: int = 1800):
    """
    Continuously monitors subscription validity.
    When a user's premium plan is approaching expiration (<= 24h) or has just expired,
    it automatically sends a personalized renewal warning message with an interactive
    'Renew Now' inline button. Clicking 'Renew Now' opens the plan selection and dynamic UPI QR!
    """
    await asyncio.sleep(20)  # Initial grace period after bot launch
    while True:
        try:
            expiring_users = await db.get_expiring_premium_users()
            for u in expiring_users:
                user_id = u["user_id"]
                username = u["username"]
                plan_name = u["plan"].upper()
                is_expired = u.get("is_expired", False)

                if is_expired:
                    heading = "⚠️ <b>Your Premium Subscription Has Expired!</b>"
                    body = (
                        f"Hello @{username}, your <b>{plan_name}</b> plan has expired and you are back on the Free Tier.\n\n"
                        f"To keep high-speed downloads and turbo link creation, tap <b>'🔄 Renew Now (रिन्यू करें)'</b> to renew now!"
                    )
                else:
                    heading = "⚠️ <b>Subscription Expiry Alert / रिन्यूअल सूचना</b>"
                    body = (
                        f"Hello @{username}, your <b>{plan_name}</b> subscription <b>expires within 24 hours</b>.\n\n"
                        f"Renew now to keep enjoying high-speed downloads and uploads without interruption!\n\n"
                        f"👉 Tap <b>'🔄 Renew Now (रिन्यू करें)'</b> below and choose your plan."
                    )

                kb = InlineKeyboardMarkup([
                    [InlineKeyboardButton("🔄 Renew Now (रिन्यू करें)", callback_data="btn_renew")],
                    [InlineKeyboardButton("💎 View All Plans", callback_data="btn_plans")],
                    [InlineKeyboardButton("💬 Support Group", url=f"https://t.me/{GROUP_USERNAME.replace('@','')}" if GROUP_USERNAME else "https://t.me")]
                ])

                try:
                    await client.send_message(
                        chat_id=user_id,
                        text=f"{heading}\n\n{body}",
                        reply_markup=kb
                    )
                    await db.mark_expiry_notified(user_id)
                    logger.info(f"Dispatched subscription expiry alert to user {user_id}")
                except Exception as notif_err:
                    logger.warning(f"Could not send renewal notice to user {user_id}: {notif_err}")

                await asyncio.sleep(1)

        except Exception as loop_err:
            logger.error(f"Error in subscription expiry watcher: {loop_err}")

        await asyncio.sleep(check_interval_seconds)

async def main():
    await db.init()
    await app.start()
    me = await app.get_me()
    logger.info(f"⚡ {BRAND_NAME} started as @{me.username}")
    if not TERABOX_API_URL:
        logger.error("TERABOX_API_URL is empty - set it in your host variables / .env (downloads will fail)")
    await start_web(me.username)
    if not BASE_URL:
        logger.warning("BASE_URL is not set - Watch Now / Download Now buttons are disabled for big files. "
                       "Set BASE_URL=https://your-domain (see README)")
    await init_logger_groups(app)
    await resume_pending_orders(app)
    asyncio.create_task(send_group_log(
        app, LOG_GROUP_ID,
        f"🟢 <b>Bot Started</b>\n\n• <b>Bot:</b> @{me.username}\n• <b>Time:</b> <code>{_now_str()}</code>"
    ))
    watcher = asyncio.create_task(schedule_subscription_expiry_watcher(app))
    await idle()
    watcher.cancel()
    await stop_web()
    await app.stop()


if __name__ == "__main__":
    print("⚡ Beta Bot Hub is starting...")
    app.run(main())
