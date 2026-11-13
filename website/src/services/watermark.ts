/**
 * Utility to generate a watermarked video thumbnail featuring "BETA BOT HUB"
 */

export async function generateWatermarkedThumbnail(
  imageUrl: string,
  watermarkText: string = 'BETA BOT HUB'
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        resolve(imageUrl);
        return;
      }

      // Canvas dimensions based on image
      canvas.width = img.width || 640;
      canvas.height = img.height || 360;

      // Draw the original thumbnail
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Add a subtle dark vignette/gradient at bottom-right for contrast
      const gradient = ctx.createLinearGradient(
        canvas.width * 0.5,
        canvas.height * 0.7,
        canvas.width,
        canvas.height
      );
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0.75)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Watermark Badge dimensions
      const fontSize = Math.max(14, Math.floor(canvas.width * 0.035));
      ctx.font = `800 ${fontSize}px "Plus Jakarta Sans", sans-serif`;
      
      const badgeText = watermarkText.toUpperCase();
      const textMetrics = ctx.measureText(badgeText);
      const paddingX = fontSize * 1.0;
      const paddingY = fontSize * 0.5;
      const badgeWidth = textMetrics.width + paddingX * 2 + fontSize * 1.2;
      const badgeHeight = fontSize + paddingY * 2;

      // Position: bottom right
      const x = canvas.width - badgeWidth - fontSize;
      const y = canvas.height - badgeHeight - fontSize;
      const radius = 8;

      // Pill Background with glowing border
      ctx.save();
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(x, y, badgeWidth, badgeHeight, radius) : ctx.rect(x, y, badgeWidth, badgeHeight);
      ctx.fillStyle = 'rgba(11, 15, 25, 0.88)';
      ctx.shadowColor = 'rgba(6, 182, 212, 0.6)';
      ctx.shadowBlur = 10;
      ctx.fill();

      // Border outline
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.9)';
      ctx.stroke();
      ctx.restore();

      // Draw glowing dot or mini logo
      const dotRadius = fontSize * 0.28;
      const dotX = x + paddingX + dotRadius;
      const dotY = y + badgeHeight / 2;

      ctx.save();
      ctx.beginPath();
      ctx.arc(dotX, dotY, dotRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#06b6d4'; // Cyan
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.restore();

      // Draw Watermark Text in crisp white/cyan
      ctx.fillStyle = '#ffffff';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeText, dotX + dotRadius * 2 + 4, y + badgeHeight / 2 + 1);

      // Also subtle top-left logo tag
      ctx.save();
      ctx.font = `600 ${Math.max(10, Math.floor(fontSize * 0.7))}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 4;
      ctx.fillText('⚡ TeraBox Verified', 16, 24);
      ctx.restore();

      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };

    img.onerror = () => {
      // Fallback: create placeholder canvas with watermark if remote image blocked by CORS
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 360;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(imageUrl);
        return;
      }

      // Cool dark cyber gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 640, 360);
      bgGrad.addColorStop(0, '#0f172a');
      bgGrad.addColorStop(1, '#020617');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 640, 360);

      // Play icon symbol in center
      ctx.beginPath();
      ctx.moveTo(300, 150);
      ctx.lineTo(350, 180);
      ctx.lineTo(300, 210);
      ctx.closePath();
      ctx.fillStyle = 'rgba(6, 182, 212, 0.8)';
      ctx.fill();

      // Watermark Badge
      ctx.font = '800 20px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(watermarkText.toUpperCase(), 430, 325);

      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };

    img.src = imageUrl;
  });
}
