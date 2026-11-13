# ⚡ Beta Bot Hub - Complete Telegram Bot & Media Engine

Complete, production-ready Python Telegram bot delivering **direct video files**, **5-minute auto-deletion**, **10-minute dynamic UPI QR generation**, **MongoDB Atlas cloud database**, and **Admin manual premium grants**.

---

## 🌟 Features Implemented

1. **Direct Video File Delivery**:
   - Sends direct playable video files in Telegram chat using `client.send_video` with streaming support.
   - Fallback to download link and thumbnail preview.
2. **5-Minute Media Auto-Delete**:
   - Sent video/audio/PDF messages are automatically purged after 5 minutes to protect privacy and save server storage.
   - Warns user in the caption and sends an auto-deleted receipt after purging.
3. **Auto Payment Gateway (10-Minute QR, auto-verified)**:
   - Uses BETA BOT HUB Payment Gateway: https://betapaymentgateway.up.railway.app
   - User picks a plan → bot creates an order and sends the QR + "Pay Now" button.
   - Bot checks payment every few seconds; when PAID, the plan activates instantly (no screenshot / UTR).
   - QR is valid for 10 minutes, then the message changes to "QR Expired" with a "Generate New QR" button.
4. **MongoDB Atlas Integration**:
   - High-performance async database using `motor` and `pymongo`.
   - Stores users, quotas, premium subscriptions, and referral linkages.
   - Falls back gracefully to local SQLite if MongoDB URI is not set.
5. **Owner & Admin Manual Premium Assignment**:
   - `/addpremium <user_id> <1d|7d|1m|1y> <pro|beta>`
   - `/removepremium <user_id>`
   - `/checkuser <user_id>`
6. **Owner & Admin Broadcast System**:
   - Strictly restricted to `ADMIN_IDS` (Bot Owner & Admins). Normal users receive access denied.
   - `/broadcast <text message>` dispatches announcements to all registered users.
   - Reply to any photo, video, audio, or formatted post with `/broadcast` to forward it to everyone.
   - Built-in `FloodWait` handling, progress updates, and activity logger group reporting.
7. **Automated Premium Expiry Alerts & One-Click "Renew Now"**:
   - Background watcher monitors subscription validity every 30 minutes.
   - Sends renewal warnings with a prominent **"🔄 Renew Now (रिन्यू करें)"** button when plan expires in <= 24 hours or has expired.
   - Clicking "Renew Now" triggers the plan selection menu, followed by the 10-minute auto-verified payment QR.

---

## 📋 Step-by-Step Setup Guide

### 1. Get Telegram Bot Token
1. Open Telegram and search for [@BotFather](https://t.me/BotFather).
2. Send `/newbot` and follow prompts to name your bot.
3. Copy the HTTP API token (e.g. `7123456789:ABCDefgh-12345`).
4. Set in `.env`: `BOT_TOKEN=7123456789:ABCDefgh-12345`.

### 2. Get Telegram API ID & Hash
1. Go to [my.telegram.org](https://my.telegram.org).
2. Log in with your Telegram phone number.
3. Click on **API development tools**.
4. Create a new application and copy **api_id** and **api_hash**.
5. Set in `.env`: `API_ID=...` and `API_HASH=...`.

### 3. Setup Free MongoDB Atlas
1. Visit [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) and create a free M0 cluster.
2. Under **Database Access**, create a user with username and password.
3. Under **Network Access**, add IP `0.0.0.0/0` (allow from anywhere).
4. Click **Connect** -> **Connect your application** -> **Drivers (Python 3.11)**.
5. Copy the connection string:
   `mongodb+srv://admin:<password>@cluster0.mongodb.net/betabothub?retryWrites=true&w=majority`
6. Set in `.env`: `MONGODB_URI=mongodb+srv://...`.

### 4. Configure Payment UPI ID
1. Set your PhonePe/GPay/FamPay UPI ID in `.env`:
   `UPI_ID=shivashish0@fam`
   `UPI_NAME="Shivashish Official"`
2. When users select plans (₹15, ₹27, ₹69), the bot automatically generates QR codes valid for 10 minutes with this UPI ID!

### 5. Setup 3 Dedicated Telegram Logger Groups (Group / Supergroup IDs)
Get real-time notifications in your private Telegram Groups (these are Groups, not broadcast channels):
1. Create or use 3 Telegram Groups (or Supergroups):
   - **Activity Log Group** (`LOG_GROUP_ID`): Tracks user `/start`, account registrations, referral links, and stats.
   - **Payment Log Group** (`PAYMENT_LOG_GROUP_ID`): Tracks 10-Minute UPI QR requests, UTR submissions, and plan activations.
   - **Data Log Group** (`DATA_LOG_GROUP_ID`): Tracks all **Downloads & Uploads** data (file titles, sizes, extracted video links, uploaded TeraBox links, and 5-min auto-delete status).
2. Add your bot as an **Administrator** in all 3 groups.
3. Obtain your Group IDs (typically starting with `-100` or negative numbers).
4. Set in `.env`:
   `LOG_GROUP_ID=-1001928374651`
   `PAYMENT_LOG_GROUP_ID=-1002019283741`
   `DATA_LOG_GROUP_ID=-1002198374102`

### 5b. Payment Gateway Setup
1. Open https://betapaymentgateway.up.railway.app/dashboard and create an account.
2. Copy your **API key**.
3. Set in `.env`: `PAYMENT_API_KEY=your_key_here`
4. (Optional) `PAYMENT_POLL_SECONDS=8` (how often payment is checked), `QR_EXPIRY_MINUTES=10`.

### 6. Start the Bot
```bash
# Create virtual environment and install dependencies
bash run.sh

# Or run with Docker
docker build -t betabothub .
docker run -d --name betabothub --env-file .env betabothub
```

## PlayMast Uploader + ftmgram (update)
- Files sent to the bot are uploaded to PlayMast (`PLAYMAST_API_URL`, default https://playmast-studio-bot.loca.lt) and the user gets the PlayMast link.
- Set `PLAYMAST_API_TOKEN` (Bearer token) or `PLAYMAST_EMAIL` + `PLAYMAST_PASSWORD` in `.env`.
- Library switched to `ftmgram`: all buttons get colour styles, /start and upload-result messages are sent as Rich Messages (falls back to normal HTML automatically).

---
## 🆕 v4 Update
Naya TeraBox API, **Watch Now / Download Now** buttons (API hide), 2.99 GB rule, PlayMast upload, live typewriter welcome, professional banner.
Poora setup: **[DEPLOY_HINDI.md](DEPLOY_HINDI.md)** • Variables: **.env.example** • Previews: **previews/**
