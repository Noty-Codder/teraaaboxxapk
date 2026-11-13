# VPS par Bot kaise chalayein (Ubuntu)

1. VPS par login karke:
   ```
   sudo apt update && sudo apt install -y python3 python3-venv python3-pip unzip ffmpeg
   sudo mkdir -p /opt/betabot && sudo unzip beta-bot-hub-vps.zip -d /opt/betabot
   cd /opt/betabot/telegram-bot
   cp .env.example .env && nano .env      # apni details bharein
   chmod +x run.sh
   ```
2. Ek baar test: `./run.sh` — log me teeno "✅ Logger connected" dikhne chahiye. Ctrl+C se band karein.
3. Hamesha chalu rakhne ke liye:
   ```
   sudo cp betabot.service /etc/systemd/system/
   sudo systemctl daemon-reload && sudo systemctl enable --now betabot
   sudo journalctl -u betabot -f      # live logs
   ```
   Restart: `sudo systemctl restart betabot`

## Zaroori
- Bot ko **Channel + Group** (must join) dono me **Admin** banayein, warna join check kaam nahi karega.
- Bot ko teeno **logger groups** me add karke admin banayein. Group ID `-100...` se start hoti hai.
- Pending payments `pending_orders.json` me save hote hain — bot restart ke baad QR check apne aap chalu rahega.

## Bot ka flow
- /start → Start photo (START_PIC) + welcome + buttons
- User link bheje → pehle Must Join check → join nahi kiya to Join buttons + "✅ Maine Join Kar Liya"
- Join ke baad → video (2 GB tak chat me) + "📢 Join Bot Updates" button. 2 GB se badi file par Download / Watch Online + Join Updates button
- TeraBox API: naya ftmdeveloperz worker (TERABOX_API_URL me set hota hai, kisi ko dikhta nahi). Download 8 hisson me ek saath hota hai (tez)
- Video ke niche delete-time WARNING message → time pura hone par dono delete + "File Auto-Deleted" message
- QR 10 minute me delete → "QR Expired" + "Generate New QR". Payment aate hi QR delete + "Payment Received" message
- Loggers: Start logger (/start, bot started), Payment logger (QR bana, paid, expired, cancel, error), Download/Upload logger (file, size, user, time, failures)
