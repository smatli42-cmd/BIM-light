// Vykreslení kresby z jádra na plátno (základy 11, 29, 32). Jádro dává číslo pera, barvu a typ čáry;
// tloušťku v mm na papíře určí až tabulka per pro měřítko pohledu. Čáry mají na obrazovce stálou
// tloušťku (jako Revit), texty a šrafy jsou na papíře, takže se zvětšují s přiblížením.
import {
  penWidthMm,
  type Drawing,
  type LineType,
  type PenTable,
  type Primitive,
  type Vec2,
} from '@bim-light/core';
import type { Viewport } from '../canvas/viewport.ts';
import { drawHatch } from './hatch.ts';

/** 1 mm na papíře = 96 / 25,4 px při 100 % (tloušťka čáry na obrazovce). */
export const PX_PER_PAPER_MM = 96 / 25.4;

const DASH: Readonly<Record<LineType, number[]>> = {
  solid: [],
  dashed: [6, 4],
  dotted: [1.5, 3],
  'dash-dot': [8, 3, 1.5, 3],
};

export interface RenderContext {
  readonly ctx: CanvasRenderingContext2D;
  readonly v: Viewport;
  readonly pens: PenTable;
  readonly scale: number;
}

export function pathOf(r: RenderContext, pts: readonly Vec2[], closed: boolean) {
  const { ctx, v } = r;
  ctx.beginPath();
  pts.forEach((p, i) => {
    const s = v.toScreen(p);
    if (i === 0) ctx.moveTo(s.x, s.y);
    else ctx.lineTo(s.x, s.y);
  });
  if (closed) ctx.closePath();
}

function line(r: RenderContext, p: Extract<Primitive, { kind: 'line' }>, color?: string) {
  const { ctx } = r;
  pathOf(r, p.points, p.closed);
  ctx.strokeStyle = color ?? p.stroke.color;
  ctx.lineWidth = Math.max(0.8, penWidthMm(r.pens, p.stroke.pen, r.scale) * PX_PER_PAPER_MM);
  ctx.setLineDash(DASH[p.stroke.lineType]);
  ctx.stroke();
  ctx.setLineDash([]);
}

function text(r: RenderContext, p: Extract<Primitive, { kind: 'text' }>, color?: string) {
  const { ctx, v } = r;
  const px = p.heightMm * r.scale * v.s;
  if (px < 3) return;
  const at = v.toScreen(p.at);
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(-p.angle);
  ctx.font = `${px.toFixed(1)}px ui-monospace, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#ffffff';
  ctx.strokeText(p.text, 0, 0);
  ctx.fillStyle = color ?? p.color;
  ctx.fillText(p.text, 0, 0);
  ctx.restore();
}

/** Vykreslí jedno primitivum; `color` přebarví (výběr, zvýraznění). */
export function drawPrimitive(r: RenderContext, p: Primitive, color?: string) {
  const { ctx } = r;
  if (p.kind === 'line') return line(r, p, color);
  if (p.kind === 'text') return text(r, p, color);
  if (p.kind === 'fill') {
    pathOf(r, p.polygon, true);
    ctx.globalAlpha = 1 - p.transparency / 100;
    ctx.fillStyle = p.color;
    ctx.fill();
    // Tenký okraj stejnou barvou zakryje šev mezi sousedními výplněmi (pokos v rohu).
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.globalAlpha = 1;
    return;
  }
  drawHatch(r, p);
}

export function drawDrawing(r: RenderContext, d: Drawing) {
  for (const p of d.primitives) if (p.kind === 'fill') drawPrimitive(r, p);
  for (const p of d.primitives) if (p.kind === 'hatch') drawPrimitive(r, p);
  for (const p of d.primitives) if (p.kind === 'line' || p.kind === 'text') drawPrimitive(r, p);
}
