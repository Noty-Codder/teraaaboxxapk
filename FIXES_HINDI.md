# Beta Bot Hub – Kya Kya Fix Hua (Hinglish)

## 1. Payment – Auto Payment Gateway (naya)
Gateway: https://betapaymentgateway.up.railway.app

Flow:
1. User `/plan` ya "💎 Plans" dabata hai → plan chunta hai.
2. Bot gateway par order banata hai aur **QR photo** bhejta hai (amount mein thode paise add hote hain – user ko EXACT amount pay karna hai).
3. QR **10 minute** valid hai (`QR_EXPIRY_MINUTES=10`).
4. Bot har 8 second (`PAYMENT_POLL_SECONDS`) payment check karta hai.
5. PAID hote hi plan **turant active**, QR message "Payment Verified ✅" mein badal jata hai, Payment Log group mein entry aati hai.
6. 10 minute baad QR message "QR Expired" ho jata hai + "🔄 Generate New QR" button.
7. Screenshot / UTR / admin approval ki zarurat nahi.

QR ke neeche buttons:
```
[ 💳 Pay Now (Open UPI Page) ]
[ 🔄 Check Payment Status    ]
[ ❌ Cancel ] [ 💎 Plans ]
```
Ek user ka ek time par ek hi QR active rehta hai (spam se bachav).

Setup: gateway dashboard par account banao → API key copy karo → `.env` mein `PAYMENT_API_KEY=...` daalo.

## 2. Bot mein jo errors mile aur fix kiye
| # | Error | Fix |
|---|-------|-----|
| 1 | Plan buttons `buy_pro_7` bhejte the, par config mein `pro_7d` tha → **har baar "Plan not found"** | Buttons ab seedha config se bante hain (`buy_pro_7d`, `buy_pro_30d`, `buy_beta_30d`) |
| 2 | "❓ Help & Guide" button ka koi handler nahi tha → button ghoomta rehta tha | `btn_help` handler + `/help` command add |
| 3 | `/stats`, `/referral`, `/help` commands ka handler nahi tha | Teeno add kiye |
| 4 | Referral link `?start=12345` banta tha par code `ref_12345` dhoondta tha → **referral kabhi count nahi hota tha** | Link ab `?start=ref_12345` |
| 5 | `/broadcast` jaise commands bhi "valid link bhejo" error de dete the | Link handler ab `/` se shuru hone wale sab messages ignore karta hai |
| 6 | `asyncio.get_event_loop()` + `app.run()` → naye Python par crash / watcher nahi chalta | `app.run(main())` + `idle()` |
| 7 | Database startup par init nahi hota tha | `main()` mein `await db.init()` |
| 8 | Premium dene par user DB mein nahi hai to plan save nahi hota tha (SQLite) | User row pehle bana di jati hai |
| 9 | "My Stats" naye user par crash (`None.get`) | `or {}` fallback |
| 10 | Share button URL encode nahi tha → lambe link toot jate the | `quote()` se encode |
| 11 | Error messages mein `<` `>` aane par HTML parse error | `html.escape` |
| 12 | Purana fake "Copy UPI" + manual UTR system (64-byte limit risk) | Hata ke auto gateway lagaya |
| 13 | HTML parse mode set nahi tha | `parse_mode=ParseMode.HTML` |

## 3. DiskWalla – poora hataya
- `diskwalla_downloader.py` file delete
- bot.py se import, link check, texts hataye
- Website: types, extractor, settings popup (API key/cookie boxes), bot preview ke buttons/toggle, downloader, header, title, metadata – sab jagah se hataya
- Ab poore project mein "DiskWalla" ka 0 mention hai

## 4. Telegram buttons ka sahi format
```python
InlineKeyboardMarkup([
    [btn1, btn2],   # ek row = ek list, max 2 buttons mobile par achhe lagte hain
    [btn3],         # full-width button
])
```
Rules:
- Har callback handler mein `await query.answer()` zaroor – warna button par loading ghoomta rehta hai.
- `callback_data` max **64 bytes** – chhota rakho (`buy_pro_7d`, `chk_<orderId>`).
- Bahar ka link → `url="..."`, bot ka kaam → `callback_data="..."`. Dono ek button mein nahi.
- Har `callback_data` ke liye ek `@app.on_callback_query(filters.regex(...))` handler hona chahiye.

## 5. Dhyan dein (abhi bhi baaki)
- `terabox_downloader.py` abhi bhi **demo/mock** hai – asli TeraBox video nahi nikalta. Asli TeraBox API/resolver chahiye.
- Pending payment orders memory mein rehte hain; bot restart hone par us waqt ke chalu QR ka auto-check ruk jayega (user naya QR bana sakta hai).
- Website wala "Plans" page sirf demo/preview hai; asli payment bot mein hota hai.
