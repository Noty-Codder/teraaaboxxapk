# 🚀 Beta Bot Hub — Deploy Guide (Heroku / Railway / VPS)

## Kya naya hai (v4)
- ✅ Naya TeraBox API (`ftmdeveloperz`) — sirf **environment variable** me rahta hai, code/GitHub me nahi.
- ✅ **API hide**: buttons me kabhi API link nahi aata. User ko sirf `BASE_URL/watch/<token>` ya `BASE_URL/dl/<token>` dikhta hai.
- ✅ Har video ke saath **▶️ Watch Now** + **⬇️ Download Now** buttons (2 GB se kam ho tab bhi).
- ✅ **2 GB tak** video seedha chat me. **2 GB – 2.99 GB** video chat me nahi (Telegram limit) → sirf buttons.
- ✅ **2.99 GB se bada** → video nahi aayega, warning + Watch Now / Download Now buttons.
- ✅ Upload → **PlayMast** (progress, speed, ETA, time sab live).
- ✅ `/start` pe **live typewriter** welcome (HTML format) + professional banner.
- ✅ Errors / logs / log-group me API address `***` ho jata hai.

## Zaroori variables
| Variable | Value | Zaroori? |
|---|---|---|
| `API_ID`, `API_HASH`, `BOT_TOKEN`, `ADMIN_IDS` | Telegram se | ✅ |
| `TERABOX_API_URL` | `https://terabox-api.ftmdeveloperz.workers.dev/api?url=` | ✅ |
| `BASE_URL` | bot ka public address, jaise `https://mybot.up.railway.app` | ✅ (VPS pe zaroori) |
| `PORT` | host khud deta hai (VPS pe `8080`) | auto |
| `WEB_SECRET` | koi bhi random text | ✅ recommended |
| `PLAYMAST_API_TOKEN` (ya EMAIL+PASSWORD) | PlayMast se | ✅ upload ke liye |
| `CHANNEL_USERNAME`, `GROUP_USERNAME`, `UPDATES_CHANNEL` | bot dono me admin | ✅ |
| `LOG_GROUP_ID`, `PAYMENT_LOG_GROUP_ID`, `DATA_LOG_GROUP_ID` | group IDs | optional |
| `MONGODB_URI` | khali = SQLite | optional |
| `MAX_SEND_MB=2000`, `MAX_DOWNLOAD_GB=2.99`, `MAX_UPLOAD_MB=2000` | size rules | default theek |
| `BRAND_NAME`, `BRAND_TAGLINE`, `WATERMARK_TEXT`, `WELCOME_TYPING` | branding | optional |
| `PROXY_MODE` | `stream` (API+CDN dono hide) / `redirect` | default `stream` |

Poori list: `.env.example`

## 1) Railway (sabse easy)
1. Code GitHub (private repo) pe daalo → Railway → *New Project → Deploy from GitHub*.
2. **Variables** me upar wali values daalo.
3. *Settings → Networking → Generate Domain* karo. Railway `RAILWAY_PUBLIC_DOMAIN` khud set karta hai, isliye `BASE_URL` auto-detect ho jata hai (ya manually daal do).
4. Deploy. Logs me `🌐 Web server running` aur `started as @yourbot` dikhna chahiye.

## 2) Heroku
1. `Procfile` me ab `web: python3 bot.py` hai (worker nahi) — web dyno zaroori hai taaki links chalein.
2. `heroku create myapp` → `heroku config:set KEY=VALUE ...` (ya dashboard → Config Vars).
3. `heroku config:set BASE_URL=https://myapp.herokuapp.com`
4. `git push heroku main` → `heroku ps:scale web=1`
> Heroku free/eco dyno me disk chhoti hoti hai aur 30 sec request timeout hai; bade videos ke liye Railway/VPS behtar.

## 3) VPS (Ubuntu)
```bash
cd telegram-bot
cp .env.example .env && nano .env      # sab values bharo, BASE_URL=http://TUMHARA_IP:8080
bash run.sh                            # ya systemd: betabot.service
```
- Port `8080` firewall me kholo: `sudo ufw allow 8080`.
- Behtar: domain + Nginx/Caddy se **https** lagao, phir `BASE_URL=https://bot.tumhara-domain.com`.
- Docker: `docker build -t betabot . && docker run -d --env-file .env -p 8080:8080 betabot`

## Test checklist
1. `/start` → banner + typing effect aana chahiye.
2. TeraBox link bhejo (chhota video) → progress → video + **Watch Now / Download Now**.
3. Buttons kholo → address bar me sirf `/watch/xxxx` — koi `workers.dev` nahi.
4. 2 GB+ file ka link → video nahi, buttons + note. 2.99 GB+ → ✖ warning.
5. Bot ko koi video bhejo → PlayMast link.

## Dhyan rakho
- `.env` GitHub pe **kabhi** mat daalo (`.gitignore` me hai).
- `BASE_URL` khali hai to bade videos ke buttons nahi bante (bot warning dikhata hai).
- `PROXY_MODE=stream` me file aapke server se guzarti hai → server bandwidth lagta hai. Bandwidth bachana ho to `redirect` (par tab CDN link browser me dikh sakta hai).
- Naye API ka JSON format maine flexible parse rakha hai (`download_url`, `dlink`, `stream_url`, `file_name`, `size`, `thumbnail` jaise common keys). Agar API alag keys deta hai to `terabox_downloader.py` me `_pick(...)` lists me key add kar do.
- Preview images: `previews/` folder (mock-ups); banner badalna ho: `python3 tools/make_banner.py`.
