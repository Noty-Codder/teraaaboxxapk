"""
Automated Thumbnail Watermarking Engine using Pillow
Stamps 'BETA BOT HUB' in a stylish glowing pill badge
"""
import os
import io
import uuid
import aiohttp
from PIL import Image, ImageDraw, ImageFont

async def stamp_watermark(image_url: str, badge_text: str = "BETA BOT HUB") -> str:
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(image_url) as resp:
                if resp.status != 200:
                    return ""
                image_bytes = await resp.read()

        uid = uuid.uuid4().hex[:10]
        temp_in = f"temp_in_{uid}.jpg"
        temp_out = f"temp_watermarked_{uid}.jpg"
        with open(temp_in, "wb") as f:
            f.write(image_bytes)

        with Image.open(temp_in).convert("RGBA") as base:
            txt_layer = Image.new("RGBA", base.size, (255, 255, 255, 0))
            draw = ImageDraw.Draw(txt_layer)
            width, height = base.size

            font_size = max(18, int(height * 0.045))
            font_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets", "fonts", "DejaVuSans-Bold.ttf")
            try:
                font = ImageFont.truetype(font_path, font_size)
            except Exception:
                try:
                    font = ImageFont.truetype("DejaVuSans-Bold.ttf", font_size)
                except Exception:
                    font = ImageFont.load_default()

            pad_x, pad_y = 16, 8
            badge_w = int(font_size * len(badge_text) * 0.65) + (pad_x * 2)
            badge_h = font_size + (pad_y * 2)

            x = width - badge_w - 20
            y = 20

            # Draw rounded background pill
            draw.rounded_rectangle([x, y, x + badge_w, y + badge_h], radius=10, fill=(11, 15, 25, 225), outline=(6, 182, 212, 255), width=2)
            
            # Cyan pulsing dot
            dot_r = 5
            dot_x = x + pad_x
            dot_y = y + badge_h // 2
            draw.ellipse([dot_x - dot_r, dot_y - dot_r, dot_x + dot_r, dot_y + dot_r], fill=(6, 182, 212, 255))

            # Watermark text
            draw.text((dot_x + 12, y + pad_y), badge_text, font=font, fill=(255, 255, 255, 255))

            watermarked = Image.alpha_composite(base, txt_layer)
            watermarked.convert("RGB").save(temp_out, "JPEG", quality=92)

        if os.path.exists(temp_in):
            os.remove(temp_in)
        return temp_out

    except Exception as e:
        print(f"Watermark error: {e}")
        return ""
