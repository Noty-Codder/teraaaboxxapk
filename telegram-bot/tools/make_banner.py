"""Generates assets/banner.png (welcome banner). Run:  python3 tools/make_banner.py
Change BRAND below (or pass env BRAND_NAME / BRAND_TAGLINE) and re-run to rebrand."""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BRAND = os.getenv("BRAND_NAME", "BETA BOT HUB").upper()
TAG = os.getenv("BRAND_TAGLINE", "TeraBox Video Downloader & Cloud Uploader")
W, H = 1280, 640
F_B = os.path.join(ROOT, "assets", "fonts", "DejaVuSans-Bold.ttf")
F_R = os.path.join(ROOT, "assets", "fonts", "DejaVuSans.ttf")


def font(p, s):
    return ImageFont.truetype(p, s)


# background gradient
img = Image.new("RGB", (W, H), (8, 12, 22))
px = img.load()
for y in range(H):
    for x in range(W):
        t = x / W
        r = int(8 + 6 * t + 4 * (y / H))
        g = int(12 + 20 * t)
        b = int(22 + 38 * t)
        px[x, y] = (r, g, b)

# glow blobs
glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
gd = ImageDraw.Draw(glow)
gd.ellipse([760, -160, 1400, 480], fill=(6, 182, 212, 110))
gd.ellipse([-200, 380, 420, 900], fill=(59, 130, 246, 90))
glow = glow.filter(ImageFilter.GaussianBlur(120))
img = Image.alpha_composite(img.convert("RGBA"), glow)

# subtle grid (drawn on its own layer so the alpha really blends)
grid = Image.new("RGBA", (W, H), (0, 0, 0, 0))
gl = ImageDraw.Draw(grid)
for x in range(0, W, 64):
    gl.line([(x, 0), (x, H)], fill=(255, 255, 255, 9))
for y in range(0, H, 64):
    gl.line([(0, y), (W, y)], fill=(255, 255, 255, 9))
img = Image.alpha_composite(img, grid)
d = ImageDraw.Draw(img)

# logo tile
d.rounded_rectangle([90, 96, 190, 196], radius=26, fill=(6, 182, 212, 255))
d.polygon([(124, 118), (124, 174), (168, 146)], fill=(8, 12, 22, 255))  # play icon

# brand + tagline
d.text((90, 236), BRAND, font=font(F_B, 80), fill=(255, 255, 255, 255))
d.text((94, 340), TAG, font=font(F_R, 30), fill=(148, 163, 184, 255))

# feature chips
chips = ["Watch Now", "Download Now", "Up to 2.99 GB"]
x = 90
for c in chips:
    f = font(F_B, 24)
    w = d.textlength(c, font=f) + 44
    d.rounded_rectangle([x, 440, x + w, 494], radius=27, fill=(13, 20, 36, 235), outline=(6, 182, 212, 255), width=2)
    d.ellipse([x + 16, 461, x + 28, 473], fill=(6, 182, 212, 255))
    d.text((x + 36, 453), c, font=f, fill=(229, 231, 235, 255))
    x += int(w) + 16

# right: phone-like player card
cx, cy, cw, ch = 930, 130, 300, 380
d.rounded_rectangle([cx, cy, cx + cw, cy + ch], radius=34, fill=(15, 23, 42, 240), outline=(30, 41, 59, 255), width=3)
d.rounded_rectangle([cx + 22, cy + 22, cx + cw - 22, cy + 200], radius=22, fill=(2, 6, 23, 255))
d.ellipse([cx + cw // 2 - 44, cy + 111 - 44, cx + cw // 2 + 44, cy + 111 + 44], fill=(6, 182, 212, 255))
d.polygon([(cx + cw // 2 - 14, cy + 111 - 24), (cx + cw // 2 - 14, cy + 111 + 24), (cx + cw // 2 + 26, cy + 111)], fill=(8, 12, 22, 255))
d.rounded_rectangle([cx + 22, cy + 222, cx + cw - 22, cy + 232], radius=5, fill=(30, 41, 59, 255))
d.rounded_rectangle([cx + 22, cy + 222, cx + 22 + 190, cy + 232], radius=5, fill=(6, 182, 212, 255))
d.rounded_rectangle([cx + 22, cy + 260, cx + 22 + 120, cy + 318], radius=16, fill=(6, 182, 212, 255))
d.text((cx + 38, cy + 275), "Watch", font=font(F_B, 22), fill=(8, 12, 22, 255))
d.rounded_rectangle([cx + 154, cy + 260, cx + cw - 22, cy + 318], radius=16, fill=(30, 41, 59, 255))
d.text((cx + 164, cy + 277), "Download", font=font(F_B, 19), fill=(229, 231, 235, 255))

# footer line
d.text((90, 556), "Fast  •  Secure  •  Private links", font=font(F_R, 26), fill=(100, 116, 139, 255))

out = os.path.join(ROOT, "assets", "banner.png")
img.convert("RGB").save(out, "PNG", optimize=True)
print("saved", out)
