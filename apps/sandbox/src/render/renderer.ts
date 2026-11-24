// Jeden snímek výkresu: kresba pohledu z jádra (základ 4), výběr, náhledy a pomocné značky.
import { dimensionFacts, drawDimension, drawView, resolveGraphics, type Primitive } from '@bim-light/core';
import type { Session } from '../session/session.ts';
import { gripViews, permDimViews } from '../interaction/hits.ts';
import { tempDimViews } from '../interaction/temp-layout.ts';
import { drawDrawing, drawPrimitive, type RenderContext } from './primitives.ts';
import {
  AUX,
  drawGrips,
  drawLock,
  drawOverlay,
  drawTempDim,
  drawWallOutlines,
  FLASH,
  SELECT,
} from './overlay.ts';

function drawModel(r: RenderContext, s: Session, hidden: readonly string[]) {
  const drawing = drawView(s.model, s.viewId);
  const sel = new Set(s.selection.dims);
  const flash = new Set(s.flashDims);
  const plain: Primitive[] = [];
  const marked: [Primitive, string][] = [];
  for (const p of drawing.primitives) {
    const dim = p.source.dimensionId;
    if (dim && hidden.includes(dim)) continue;
    if (dim && flash.has(dim)) marked.push([p, FLASH]);
    else if (dim && sel.has(dim)) marked.push([p, SELECT]);
    else plain.push(p);
  }
  drawDrawing(r, { scale: drawing.scale, primitives: plain });
  for (const [p, c] of marked) drawPrimitive(r, p, c);
}

export function render(ctx: CanvasRenderingContext2D, s: Session) {
  const v = s.viewport;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, v.width, v.height);
  const o = s.tool.overlay();
  const hidden = o.hiddenDims ?? [];
  const r: RenderContext = { ctx, v, pens: s.model.display.penTable, scale: s.view.scale };
  drawModel(r, s, hidden);
  drawWallOutlines(ctx, s, s.selection.walls, SELECT, 2);
  for (const d of o.draftDims ?? []) {
    const g = resolveGraphics(s.model.display, s.view, dimensionFacts(d)).effect;
    for (const p of drawDimension(s.model, d, s.view.scale, s.model.display.paperSizes, g))
      drawPrimitive(r, p, AUX);
  }
  if (s.tool.id === 'select') {
    const flash = new Set(s.flashDims);
    for (const d of permDimViews(s, hidden)) drawLock(ctx, d, flash.has(d.id));
    for (const t of tempDimViews(s)) drawTempDim(ctx, t);
    drawGrips(ctx, gripViews(s));
  }
  drawOverlay(ctx, s, o);
}
