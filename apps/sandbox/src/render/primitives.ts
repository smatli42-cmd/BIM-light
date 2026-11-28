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
import { canvasDpr, screenLineWidth } from './line-width.ts';
import { forPaper, PAPER_BG, type Paper } from './paper.ts';

export { PX_PER_PAPER_MM } from './line-width.ts';

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
  /** Podklad výkresu; na tmavém se barvy jen pro zobrazení přemapují (render/paper.ts). */
  readonly paper?: Paper;
  /** Vlasové čáry místo skutečné tloušťky (volba okna, koncepce rozhraní 2 G). */
  readonly hairline?: boolean;
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
  ctx.lineWidth = screenLineWidth(penWidthMm(r.pens, p.stroke.pen, r.scale), !!r.hairline, canvasDpr(ctx));
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
  ctx.font = `${p.bold ? 'bold ' : ''}${px.toFixed(1)}px ui-monospace, monospace`;
  ctx.textAlign = p.align ?? 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3;
  ctx.strokeStyle = PAPER_BG[r.paper ?? 'light'];
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
  const paper = r.paper ?? 'light';
  const prims = paper === 'light' ? d.primitives : d.primitives.map((p) => forPaper(p, paper));
  d = { ...d, primitives: prims };
  for (const p of d.primitives) if (p.kind === 'fill') drawPrimitive(r, p);
  for (const p of d.primitives) if (p.kind === 'hatch') drawPrimitive(r, p);
  for (const p of d.primitives) if (p.kind === 'line' || p.kind === 'text') drawPrimitive(r, p);
}
