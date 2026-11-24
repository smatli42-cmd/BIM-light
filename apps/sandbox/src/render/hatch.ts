// Šrafa ve výkresu: výplň materiálu a šrafa z dat, oříznutá mnohoúhelníkem vrstvy (základ 34).
// Rozměry šrafy jsou mm na papíře převedené na pixely stejným koeficientem jako tloušťky čar
// (stálé na obrazovce); počátek rastru je společný bod modelu, sousední stěny na sebe navazují.
import { penWidthMm, type Primitive } from '@bim-light/core';
import { paintHatch } from './hatch-paint.ts';
import { pathOf, PX_PER_PAPER_MM, type RenderContext } from './primitives.ts';

export function drawHatch(r: RenderContext, p: Extract<Primitive, { kind: 'hatch' }>, color?: string) {
  if (p.polygon.length < 3) return;
  const { ctx, v } = r;
  ctx.save();
  pathOf(r, p.polygon, true);
  if (p.fillColor && !color) {
    ctx.fillStyle = p.fillColor;
    ctx.fill();
    ctx.strokeStyle = p.fillColor;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.clip();
  const pts = p.polygon.map((q) => v.toScreen(q));
  const xs = pts.map((q) => q.x);
  const ys = pts.map((q) => q.y);
  ctx.strokeStyle = color ?? p.lineColor;
  ctx.lineWidth = Math.max(0.5, penWidthMm(r.pens, p.pen, r.scale) * PX_PER_PAPER_MM);
  paintHatch(ctx, p.hatch, {
    x0: Math.min(...xs),
    y0: Math.min(...ys),
    x1: Math.max(...xs),
    y1: Math.max(...ys),
    origin: v.toScreen(p.origin),
    pxPerMm: PX_PER_PAPER_MM,
  });
  ctx.restore();
}
