// Kreslení náhledu skladby (okno Editor typů, krok 2) podle rozložení z preview-layout.ts: výplň a šrafa
// materiálu (šrafa jen v řezu vrstvy, v měřítku 1 : 20), stínování ploch ve 3D, vybraná vrstva,
// referenční čára a kóty tlouštěk. Barvy materiálů z modelu, barvy rozhraní z CSS proměnných.
import { materialFill, materialLines, type Model, type Vec2 } from '@bim-light/core';
import { paintHatch } from '../../render/hatch-paint.ts';
import type { PreviewDim, PreviewFace, PreviewLayout } from './preview-layout.ts';

/** mm modelu na 1 mm papíru pro šrafy náhledu (jako výkres 1 : 20). */
const HATCH_SCALE = 20;
const SHADE: Record<PreviewFace['kind'], string | null> = {
  cut: null,
  top: 'rgba(255,255,255,0.35)',
  side: 'rgba(0,0,0,0.18)',
};

export interface PreviewColors {
  readonly paper: string;
  readonly ink: string;
  readonly accent: string;
  readonly ref: string;
}

function path(ctx: CanvasRenderingContext2D, poly: readonly Vec2[]) {
  ctx.beginPath();
  poly.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
}

function hatchFace(ctx: CanvasRenderingContext2D, model: Model, f: PreviewFace, materialId: string) {
  const m = model.materials[materialId];
  const hatch = m && model.display.hatches[m.hatchId];
  if (!m || !hatch) return;
  ctx.save();
  path(ctx, f.poly);
  ctx.clip();
  ctx.transform(f.ex.x, f.ex.y, f.ey.x, f.ey.y, f.origin.x, f.origin.y);
  ctx.strokeStyle = materialLines(m);
  ctx.lineWidth = 1 / Math.hypot(f.ex.x, f.ex.y);
  paintHatch(ctx, hatch, {
    x0: 0,
    y0: 0,
    x1: f.size.w,
    y1: f.size.h,
    origin: { x: 0, y: 0 },
    pxPerMm: HATCH_SCALE,
  });
  ctx.restore();
}

function paintFace(
  ctx: CanvasRenderingContext2D,
  model: Model,
  f: PreviewFace,
  materialId: string,
  c: PreviewColors,
) {
  const m = model.materials[materialId];
  path(ctx, f.poly);
  ctx.fillStyle = m ? materialFill(m) : '#dddddd';
  ctx.fill();
  const shade = SHADE[f.kind];
  if (shade) {
    ctx.fillStyle = shade;
    ctx.fill();
  }
  if (f.kind === 'cut') hatchFace(ctx, model, f, materialId);
  path(ctx, f.poly);
  ctx.strokeStyle = c.ink;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function paintDim(ctx: CanvasRenderingContext2D, d: PreviewDim, c: PreviewColors) {
  const vertical = Math.abs(d.to.x - d.from.x) < Math.abs(d.to.y - d.from.y);
  ctx.strokeStyle = c.ink;
  ctx.fillStyle = c.ink;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(d.from.x, d.from.y);
  ctx.lineTo(d.to.x, d.to.y);
  for (const p of [d.from, d.to]) {
    ctx.moveTo(p.x - 4, p.y + 4);
    ctx.lineTo(p.x + 4, p.y - 4);
  }
  ctx.stroke();
  ctx.save();
  ctx.translate((d.from.x + d.to.x) / 2, (d.from.y + d.to.y) / 2);
  if (vertical) ctx.rotate(-Math.PI / 2);
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(d.text, 0, -2);
  ctx.restore();
}

function highlight(ctx: CanvasRenderingContext2D, f: PreviewFace, c: PreviewColors) {
  path(ctx, f.poly);
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = c.accent;
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = c.accent;
  ctx.lineWidth = 2.5;
  ctx.stroke();
}

/** Nakreslí celý náhled; `materials[i]` = materiál vrstvy i, `selected` = vybraná vrstva. */
export function paintPreview(
  ctx: CanvasRenderingContext2D,
  model: Model,
  layout: PreviewLayout,
  materials: readonly string[],
  selected: number | null,
  c: PreviewColors,
) {
  // Vybraná vrstva se zvýrazní hned po své ploše, takže ji bližší vrstvy (ve 3D) správně zakryjí.
  for (const f of layout.faces) {
    paintFace(ctx, model, f, materials[f.layer] ?? '', c);
    if (f.layer === selected) highlight(ctx, f, c);
  }
  if (layout.refLine) {
    const [a, b] = layout.refLine;
    ctx.strokeStyle = c.ref;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 3]);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  for (const d of layout.dims) paintDim(ctx, d, c);
}
