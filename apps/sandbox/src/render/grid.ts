// Mřížka na pozadí (katalog kreslení 2.6): jen když je zapnutá; hustá síť se skryje, když by byla
// hustší než 8 px, každá desátá čára je výraznější. Světle modrá jako ostatní pomocné značky.
import type { Viewport } from '../canvas/viewport.ts';

const MIN_PX = 8;

export function drawGrid(ctx: CanvasRenderingContext2D, v: Viewport, step: number) {
  if (!(step > 0)) return;
  let s = step;
  while (s * v.s < MIN_PX) s *= 10;
  const a = v.toWorld({ x: 0, y: v.height });
  const b = v.toWorld({ x: v.width, y: 0 });
  const [x0, x1] = [Math.min(a.x, b.x), Math.max(a.x, b.x)];
  const [y0, y1] = [Math.min(a.y, b.y), Math.max(a.y, b.y)];
  ctx.lineWidth = 1;
  for (let x = Math.ceil(x0 / s) * s; x <= x1; x += s) {
    const p = v.toScreen({ x, y: 0 });
    ctx.strokeStyle = Math.round(x / s) % 10 === 0 ? '#c9dcf2' : '#e8f0fa';
    ctx.beginPath();
    ctx.moveTo(Math.round(p.x) + 0.5, 0);
    ctx.lineTo(Math.round(p.x) + 0.5, v.height);
    ctx.stroke();
  }
  for (let y = Math.ceil(y0 / s) * s; y <= y1; y += s) {
    const p = v.toScreen({ x: 0, y });
    ctx.strokeStyle = Math.round(y / s) % 10 === 0 ? '#c9dcf2' : '#e8f0fa';
    ctx.beginPath();
    ctx.moveTo(0, Math.round(p.y) + 0.5);
    ctx.lineTo(v.width, Math.round(p.y) + 0.5);
    ctx.stroke();
  }
}
