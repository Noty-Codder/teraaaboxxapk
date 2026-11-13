"""Draws illustrative previews (mock-ups) of the bot messages and the Watch page -> previews/*.png"""
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FB = os.path.join(ROOT, "assets", "fonts", "DejaVuSans-Bold.ttf")
FR = os.path.join(ROOT, "assets", "fonts", "DejaVuSans.ttf")
F = lambda p, s: ImageFont.truetype(p, s)

BG, BUB, TXT, MUT, ACC, ACC2 = (14, 22, 33), (24, 37, 51), (236, 240, 245), (140, 156, 175), (6, 182, 212), (59, 130, 246)
GREEN, RED = (34, 160, 90), (200, 60, 60)


def wrap(d, text, font, maxw):
    out = []
    for para in text.split("\n"):
        line = ""
        for wd in para.split(" "):
            t = (line + " " + wd).strip()
            if d.textlength(t, font=font) <= maxw:
                line = t
            else:
                out.append(line); line = wd
        out.append(line)
    return out


def panel(title, lines, buttons, w=470, banner=True, mono=None):
    """lines: list of (text, style) style in b/r/m(muted)/c(code)"""
    tmp = Image.new("RGB", (w, 10)); td = ImageDraw.Draw(tmp)
    pad = 18
    rows = []
    for text, st in lines:
        font = F(FB if st == "b" else FR, 17 if st != "h" else 21)
        if st == "h":
            font = F(FB, 21)
        for ln in wrap(td, text, font, w - 2 * pad - 36):
            rows.append((ln, st, font))
    bh = 150 if banner else 0
    h = 70 + bh + 24 + len(rows) * 25 + 24 + (len(buttons) * 54 + 10 if buttons else 0) + 40
    img = Image.new("RGB", (w, h), BG); d = ImageDraw.Draw(img)
    d.rectangle([0, 0, w, 52], fill=(23, 33, 43)); d.ellipse([14, 9, 48, 43], fill=ACC)
    d.text((26, 14), "B", font=F(FB, 18), fill=(8, 12, 22))
    d.text((60, 8), title, font=F(FB, 17), fill=TXT); d.text((60, 30), "bot", font=F(FR, 12), fill=MUT)
    y = 66
    bub_h = bh + 16 + len(rows) * 25 + 16
    d.rounded_rectangle([12, y, w - 12, y + bub_h], radius=16, fill=BUB)
    if banner:
        ban = Image.open(os.path.join(ROOT, "assets", "banner.png")).convert("RGB").resize((w - 24, bh))
        mask = Image.new("L", ban.size, 0); ImageDraw.Draw(mask).rounded_rectangle([0, 0, ban.size[0], ban.size[1]], radius=14, fill=255)
        img.paste(ban, (12, y), mask); y += bh
    y += 14
    for ln, st, font in rows:
        col = {"b": TXT, "r": TXT, "m": MUT, "c": ACC, "h": TXT, "w": (250, 190, 70), "e": (240, 110, 110)}.get(st, TXT)
        d.text((pad + 6, y), ln, font=font, fill=col); y += 25
    y += 22
    for row in buttons:
        bw = (w - 24 - 8 * (len(row) - 1)) // len(row)
        x = 12
        for label, kind in row:
            colr = {"g": (30, 110, 80), "p": (35, 75, 140), "r": (140, 45, 45)}[kind]
            d.rounded_rectangle([x, y, x + bw, y + 44], radius=11, fill=colr)
            f = F(FB, 15); tw = d.textlength(label, font=f)
            d.text((x + (bw - tw) / 2, y + 12), label, font=f, fill=(245, 250, 250)); x += bw + 8
        y += 52
    return img


def sheet(panels, path, gap=26, head=None):
    W = sum(p.width for p in panels) + gap * (len(panels) + 1)
    H = max(p.height for p in panels) + 2 * gap + (70 if head else 0)
    out = Image.new("RGB", (W, H), (8, 12, 20)); d = ImageDraw.Draw(out)
    if head:
        d.text((gap, 22), head, font=F(FB, 26), fill=(229, 231, 235))
    x = gap
    for p in panels:
        out.paste(p, (x, gap + (70 if head else 0))); x += p.width + gap
    out.save(path); print("saved", path)


p1 = panel("BETA BOT HUB", [
    ("⚡ BETA BOT HUB", "h"), ("TeraBox Video Downloader & Cloud Uploader", "m"), ("", "r"),
    ("Hello Rahul, welcome aboard!", "r"), ("", "r"),
    ("▌ Download — paste any TeraBox link and get the video with Watch Now & Download Now buttons.", "r"),
    ("▌ Upload — send any file, get a PlayMast cloud link.", "r"), ("", "r"),
    ("Your Account", "b"), ("• Tier: FREE", "c"), ("• Downloads left: 3", "c"), ("• Uploads left: 3", "c"), ("", "r"),
    ("Limits: up to 2.99 GB per file", "r"), ("Paste a TeraBox link below ▌", "b")],
    [[("Download Link", "p"), ("Create Link", "p")], [("Plans & Pricing", "p"), ("Refer & Earn", "p")]])
p2 = panel("BETA BOT HUB", [
    ("⬇ Downloading from TeraBox...", "b"), ("Movie_2026_1080p.mp4", "c"), ("", "r"),
    ("▰▰▰▰▰▰▰▱▱▱▱▱ 58.3%", "c"), ("", "r"),
    ("Processed: 698.4 MB / 1.17 GB", "r"), ("Speed: 24.80 MB/s", "r"), ("ETA: 00:20", "r"), ("Elapsed: 00:28", "r")],
    [], banner=False)
p3 = panel("BETA BOT HUB", [
    ("Movie_2026_1080p.mp4", "b"), ("", "r"), ("Size: 1.17 GB", "r"), ("By: BETA BOT HUB", "r"), ("Ready in: 00:52", "m")],
    [[("▶ Watch Now", "g"), ("⬇ Download Now", "g")], [("Join Bot Updates", "g")]], banner=True)
p4 = panel("BETA BOT HUB", [
    ("Big_Series_Pack_4K.mkv", "b"), ("", "r"), ("Size: 3.40 GB", "r"), ("By: BETA BOT HUB", "r"), ("", "r"),
    ("✖ Too large for chat!", "e"),
    ("This file is 3.40 GB, above the 2.99 GB limit, so the video will NOT be sent here. Use Watch Now or Download Now below.", "w")],
    [[("▶ Watch Now", "g"), ("⬇ Download Now", "g")], [("Join Bot Updates", "g")]], banner=False)
sheet([p1, p2, p3, p4], os.path.join(ROOT, "previews", "bot_preview.png"),
      head="Telegram bot — preview (illustrative mock-up):  /start  •  live progress  •  video + buttons  •  over 2.99 GB warning")

# ---------------- watch page
W, H = 1280, 820
im = Image.new("RGB", (W, H), (11, 15, 25)); d = ImageDraw.Draw(im)
d.rectangle([0, 0, W, 64], fill=(13, 18, 30)); d.line([0, 64, W, 64], fill=(31, 41, 55))
d.rounded_rectangle([24, 15, 58, 49], radius=10, fill=ACC); d.polygon([(35, 24), (35, 40), (49, 32)], fill=(8, 12, 22))
d.text((72, 14), "BETA BOT HUB", font=F(FB, 18), fill=TXT); d.text((72, 38), "TeraBox Video Downloader & Cloud Uploader", font=F(FR, 12), fill=MUT)
px0, px1 = 150, W - 150
d.rounded_rectangle([px0, 96, px1, 520], radius=16, fill=(0, 0, 0), outline=(31, 41, 55), width=2)
cx, cy = (px0 + px1) // 2, 300
d.ellipse([cx - 44, cy - 44, cx + 44, cy + 44], fill=ACC); d.polygon([(cx - 14, cy - 26), (cx - 14, cy + 26), (cx + 28, cy)], fill=(8, 12, 22))
d.rectangle([px0 + 20, 490, px1 - 20, 496], fill=(40, 50, 65)); d.rectangle([px0 + 20, 490, px0 + 380, 496], fill=ACC)
d.text((px0 + 20, 468), "04:12 / 38:40", font=F(FR, 13), fill=MUT)
d.rounded_rectangle([px0, 540, px1, 780], radius=16, fill=(17, 24, 39), outline=(31, 41, 55), width=2)
d.text((px0 + 24, 560), "Movie_2026_1080p.mp4", font=F(FB, 22), fill=TXT)
x = px0 + 24
for chip in ["1.17 GB", "Video", "Secure link"]:
    f = F(FR, 14); tw = d.textlength(chip, font=f) + 28
    d.rounded_rectangle([x, 604, x + tw, 636], radius=16, fill=(13, 20, 36), outline=(31, 41, 55)); d.text((x + 14, 611), chip, font=f, fill=MUT); x += tw + 8
bw = (px1 - px0 - 48 - 12) // 2
d.rounded_rectangle([px0 + 24, 660, px0 + 24 + bw, 712], radius=12, fill=ACC)
t = "Download Now"; f = F(FB, 18); d.text((px0 + 24 + (bw - d.textlength(t, font=f)) / 2, 674), t, font=f, fill=(8, 12, 22))
d.rounded_rectangle([px0 + 36 + bw, 660, px1 - 24, 712], radius=12, fill=(13, 20, 36), outline=(31, 41, 55))
t = "Open Beta Bot Hub Bot"; d.text((px0 + 36 + bw + (bw - d.textlength(t, font=f)) / 2, 674), t, font=f, fill=TXT)
d.text((px0 + 24, 735), "Private link — expires automatically. Address bar shows only  /watch/<token>  (no API).", font=F(FR, 13), fill=MUT)
d.text((W // 2 - 190, 796), "© Beta Bot Hub • Fast & secure TeraBox delivery", font=F(FR, 13), fill=MUT)
im.save(os.path.join(ROOT, "previews", "watch_page_preview.png")); print("saved watch preview")
