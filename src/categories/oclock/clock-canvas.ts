/**
 * Draws an analog clock face onto a <canvas>. Pure rendering — given a size
 * and a time-of-day, it paints; it owns no state and schedules nothing, so
 * `view.ts` can call `drawClockFace` from a static render or an animation
 * loop alike.
 */

export interface ClockPalette {
  faceDay: string;
  faceNight: string;
  ringDay: string;
  ringNight: string;
  hourHand: string;
  minuteHand: string;
  badgeDay: string;
  badgeNight: string;
  badgeTextDay: string;
  badgeTextNight: string;
}

export const DEFAULT_CLOCK_PALETTE: ClockPalette = {
  faceDay: '#f3f1ff',
  faceNight: '#fff4e8',
  ringDay: '#4f6df5',
  ringNight: '#ef9d0e',
  hourHand: '#ef6f5b',
  minuteHand: '#4f6df5',
  badgeDay: '#dde3ff',
  badgeNight: '#ffe4cc',
  badgeTextDay: '#33429a',
  badgeTextNight: '#9a4f08',
};

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawHand(ctx: CanvasRenderingContext2D, angle: number, length: number, width: number, color: string): void {
  ctx.beginPath();
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(angle) * length, Math.sin(angle) * length);
  ctx.stroke();
}

/**
 * Renders the clock face for `totalMinutes` (minutes-since-midnight, may be
 * fractional mid-animation) into a square canvas of `size` CSS pixels. The
 * canvas must already be sized for the current devicePixelRatio by the caller
 * (see `fitCanvasToDisplaySize`).
 */
export function drawClockFace(
  ctx: CanvasRenderingContext2D,
  size: number,
  totalMinutes: number,
  palette: ClockPalette = DEFAULT_CLOCK_PALETTE,
): void {
  const center = size / 2;
  const radius = size * 0.42;
  const hour = Math.floor(totalMinutes / 60) % 24;
  const minute = totalMinutes % 60;
  const isAM = hour < 12;

  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.translate(center, center);

  // face
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = isAM ? palette.faceDay : palette.faceNight;
  ctx.fill();
  ctx.lineWidth = size * 0.017;
  ctx.strokeStyle = isAM ? palette.ringDay : palette.ringNight;
  ctx.stroke();

  // minute ticks
  for (let i = 0; i < 60; i++) {
    const angle = (i / 60) * Math.PI * 2 - Math.PI / 2;
    const isHourTick = i % 5 === 0;
    const inner = isHourTick ? radius - size * 0.05 : radius - size * 0.025;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * (radius - size * 0.008), Math.sin(angle) * (radius - size * 0.008));
    ctx.lineTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
    ctx.lineWidth = isHourTick ? size * 0.0125 : size * 0.006;
    ctx.strokeStyle = isHourTick ? '#5b5466' : '#b8b0a4';
    ctx.stroke();
  }

  // hour numerals
  ctx.font = `700 ${Math.round(size * 0.062)}px "Be Vietnam Pro", sans-serif`;
  ctx.fillStyle = '#3a3442';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 1; i <= 12; i++) {
    const angle = (i * Math.PI) / 6 - Math.PI / 2;
    ctx.fillText(String(i), Math.cos(angle) * radius * 0.71, Math.sin(angle) * radius * 0.71);
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // hands
  const minuteAngle = (minute / 60) * Math.PI * 2 - Math.PI / 2;
  const hourAngle = ((hour % 12) + minute / 60) * (Math.PI / 6) - Math.PI / 2;
  drawHand(ctx, hourAngle, radius * 0.56, size * 0.029, palette.hourHand);
  drawHand(ctx, minuteAngle, radius * 0.82, size * 0.021, palette.minuteHand);

  // center pin
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.021, 0, Math.PI * 2);
  ctx.fillStyle = '#2a2530';
  ctx.fill();

  // AM/PM badge
  const badgeWidth = size * 0.2;
  const badgeHeight = size * 0.092;
  ctx.fillStyle = isAM ? palette.badgeDay : palette.badgeNight;
  roundedRect(ctx, -badgeWidth / 2, radius * 0.42, badgeWidth, badgeHeight, badgeHeight * 0.32);
  ctx.fill();
  ctx.fillStyle = isAM ? palette.badgeTextDay : palette.badgeTextNight;
  ctx.font = `700 ${Math.round(size * 0.054)}px "Be Vietnam Pro", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(isAM ? 'AM' : 'PM', 0, radius * 0.42 + badgeHeight / 2 + size * 0.004);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  ctx.restore();
}

/**
 * Sizes a canvas's backing store for the current devicePixelRatio so the face
 * stays crisp on retina displays, and returns the CSS pixel size to draw at.
 */
export function fitCanvasToDisplaySize(canvas: HTMLCanvasElement, cssSize: number): number {
  const ratio = window.devicePixelRatio || 1;
  const targetWidth = Math.round(cssSize * ratio);
  const targetHeight = Math.round(cssSize * ratio);
  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    canvas.width = targetWidth;
    canvas.height = targetHeight;
  }
  canvas.style.width = `${cssSize}px`;
  canvas.style.height = `${cssSize}px`;
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return cssSize;
}
