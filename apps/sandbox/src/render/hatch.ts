// Šrafa ve výkresu: výplň materiálu a šrafa z dat, oříznutá mnohoúhelníkem vrstvy (základ 34).
// Rozměry šrafy jsou mm na papíře (základ 29): na obrazovce se zvětšují s přiblížením stejně jako
// texty (mm papíru × měřítko × zoom). Počátek rastru je společný bod modelu, sousední stěny navazují.
import { penWidthMm, type Primitive } from '@bim-light/core';
import { paintHatch } from './hatch-paint.ts';
import { canvasDpr, screenLineWidth } from './line-width.ts';
import { pathOf, type RenderContext } from './primitives.ts';

/** Pod tímto počtem px na 1 mm papíru (velké oddálení) se kreslí jen výplň, čáry by splynuly. */
export const HATCH_MIN_PX_PER_MM = 1;

/** Kolik px na obrazovce odpovídá 1 mm na papíře: měřítko (mm modelu na mm papíru) × zoom (px na mm modelu). */
export const hatchPxPerMm = (scale: number, pxPerModelMm: number): number => scale * pxPerModelMm;

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
  const pxPerMm = hatchPxPerMm(r.scale, v.s);
  if (pxPerMm < HATCH_MIN_PX_PER_MM) {
    ctx.restore();
    return;
  }
  ctx.clip();
  const pts = p.polygon.map((q) => v.toScreen(q));
  const xs = pts.map((q) => q.x);
  const ys = pts.map((q) => q.y);
  ctx.strokeStyle = color ?? p.lineColor;
  const dpr = canvasDpr(ctx);
  ctx.lineWidth = screenLineWidth(penWidthMm(r.pens, p.pen, r.scale), !!r.hairline, dpr);
  paintHatch(ctx, p.hatch, {
    x0: Math.min(...xs),
    y0: Math.min(...ys),
    x1: Math.max(...xs),
    y1: Math.max(...ys),
    origin: v.toScreen(p.origin),
    pxPerMm,
    bands: false,
    pixel: dpr,
  });
  if (p.curves) {
    ctx.beginPath();
    for (const c of p.curves)
      c.forEach((q, i) => {
        const s = v.toScreen(q);
        if (i) ctx.lineTo(s.x, s.y);
        else ctx.moveTo(s.x, s.y);
      });
    ctx.stroke();
  }
  ctx.restore();
}
