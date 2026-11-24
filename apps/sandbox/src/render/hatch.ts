// Šrafa: rovnoběžné čáry vzoru z knihovny šraf, rozteč v mm na papíře (základ 29),
// oříznuté mnohoúhelníkem. Tloušťka čáry z pera (základ 32).
import { findHatchPattern, penWidthMm, type Primitive } from '@bim-light/core';
import { pathOf, PX_PER_PAPER_MM, type RenderContext } from './primitives.ts';

export function drawHatch(r: RenderContext, p: Extract<Primitive, { kind: 'hatch' }>) {
  const pattern = findHatchPattern(p.patternId);
  if (!pattern || !pattern.lines.length || p.polygon.length < 3) return;
  const { ctx, v } = r;
  const pts = p.polygon.map((q) => v.toScreen(q));
  const xs = pts.map((q) => q.x);
  const ys = pts.map((q) => q.y);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  const diag = Math.hypot(x1 - x0, y1 - y0);
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  ctx.save();
  pathOf(r, p.polygon, true);
  ctx.clip();
  ctx.strokeStyle = p.color;
  ctx.lineWidth = Math.max(0.5, penWidthMm(r.pens, p.pen, r.scale) * PX_PER_PAPER_MM);
  for (const hl of pattern.lines) {
    const step = hl.spacingMm * r.scale * v.s;
    if (step < 2) continue;
    const a = (-hl.angleDeg * Math.PI) / 180;
    const d = { x: Math.cos(a), y: Math.sin(a) };
    const n = { x: -d.y, y: d.x };
    const dash = hl.dashMm.map((m) => Math.max(0.5, m * r.scale * v.s));
    ctx.setLineDash(dash);
    ctx.beginPath();
    for (let k = -Math.ceil(diag / step); k <= Math.ceil(diag / step); k++) {
      const o = { x: cx + n.x * k * step, y: cy + n.y * k * step };
      ctx.moveTo(o.x - d.x * diag, o.y - d.y * diag);
      ctx.lineTo(o.x + d.x * diag, o.y + d.y * diag);
    }
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.restore();
}
