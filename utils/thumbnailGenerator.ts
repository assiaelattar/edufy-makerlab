
import { StationType } from '../types';
import { STATION_THEMES } from './theme';

/**
 * Generates a branded project thumbnail using HTML5 Canvas.
 * Returns a Base64 string of the image.
 */
export const generateProjectThumbnail = async (
    title: string, 
    studentName: string, 
    station: StationType,
    academyName: string = "Edufy Makerlab"
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const width = 1200;
        const height = 630;
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            reject("Canvas not supported");
            return;
        }

        const theme = STATION_THEMES[station] || STATION_THEMES.general;
        
        // 1. Background Gradient (Dark + Station Color)
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#0f172a'); // Slate-950
        gradient.addColorStop(1, '#1e293b'); // Slate-800
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // 2. Accent Glow (Top Right)
        const glow = ctx.createRadialGradient(width, 0, 0, width, 0, 800);
        glow.addColorStop(0, `${theme.colorHex}66`); // 40% opacity
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);

        // 3. Grid Pattern Overlay
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.05;
        const gridSize = 60;
        
        // Draw Grid
        for(let x=0; x<=width; x+=gridSize) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
        }
        for(let y=0; y<=height; y+=gridSize) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
        }
        ctx.globalAlpha = 1.0;

        // 4. Station Badge / Pill
        const badgeX = 80;
        const badgeY = 80;
        const badgeW = 400;
        const badgeH = 60;
        
        ctx.fillStyle = `${theme.colorHex}33`; // 20% opacity bg
        ctx.strokeStyle = theme.colorHex;
        ctx.lineWidth = 3;
        
        // Draw rounded rect for badge
        roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 30);
        ctx.fill();
        ctx.stroke();

        // Badge Text
        ctx.fillStyle = theme.colorHex;
        ctx.font = 'bold 24px "Inter", sans-serif';
        ctx.fillText(theme.label.toUpperCase(), badgeX + 30, badgeY + 38);

        // 5. Main Title (Multiline support)
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 72px "Inter", sans-serif';
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 20;
        
        const maxTitleWidth = width - 160;
        wrapText(ctx, title, 80, 250, maxTitleWidth, 90);

        // 6. Footer (Student Name + Academy)
        const footerY = height - 80;
        
        // Student Name
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#cbd5e1'; // Slate-300
        ctx.font = 'normal 36px "Inter", sans-serif';
        ctx.fillText("Project by", 80, footerY);
        
        ctx.fillStyle = theme.colorHex;
        ctx.font = 'bold 36px "Inter", sans-serif';
        ctx.fillText(studentName, 280, footerY);

        // Academy Branding (Right side)
        ctx.textAlign = 'right';
        ctx.fillStyle = '#64748b'; // Slate-500
        ctx.font = 'bold 32px "Inter", sans-serif';
        ctx.fillText(academyName.toUpperCase(), width - 80, footerY);

        // Resolve as Data URL
        resolve(canvas.toDataURL('image/jpeg', 0.9));
    });
};

// Helper for rounded rectangles
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.arcTo(x+w, y,   x+w, y+h, r);
  ctx.arcTo(x+w, y+h, x,   y+h, r);
  ctx.arcTo(x,   y+h, x,   y,   r);
  ctx.arcTo(x,   y,   x+w, y,   r);
  ctx.closePath();
}

// Helper for wrapping text
function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for(let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, currentY);
        line = words[n] + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, currentY);
}
