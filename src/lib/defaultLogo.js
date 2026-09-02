// High-resolution circular cyan Gatronix G logo generator
let cachedDefaultLogo = null;

export function getDefaultLogoDataUrl() {
  if (cachedDefaultLogo) return cachedDefaultLogo;
  if (typeof document === 'undefined') return '';

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    const cx = 150;
    const cy = 150;

    // Outer concentric arc (light cyan)
    ctx.beginPath();
    ctx.arc(cx, cy, 120, 0.22 * Math.PI, 1.88 * Math.PI, false);
    ctx.strokeStyle = '#5eead4';
    ctx.lineWidth = 18;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Middle concentric arc (cyan)
    ctx.beginPath();
    ctx.arc(cx, cy, 88, 0.20 * Math.PI, 1.88 * Math.PI, false);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 18;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Inner arc & G horizontal spur (blue)
    ctx.beginPath();
    ctx.arc(cx, cy, 56, 0.18 * Math.PI, 1.90 * Math.PI, false);
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 18;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Inward horizontal spur of 'G'
    ctx.beginPath();
    ctx.moveTo(cx + 8, cy);
    ctx.lineTo(cx + 56, cy);
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 18;
    ctx.lineCap = 'round';
    ctx.stroke();

    cachedDefaultLogo = canvas.toDataURL('image/png');
    return cachedDefaultLogo;
  } catch (e) {
    console.warn('Failed to generate default logo data URL:', e);
    return '';
  }
}
