// Jeden snímek výkresu: kresba pohledu z jádra (základ 4), výběr, náhledy a pomocné značky.
import {
  dimensionFacts,
  drawDimension,
  drawView,
  resolveGraphics,
  type Model,
  type Primitive,
} from '@bim-light/core';
import type { Session } from '../session/session.ts';
import { gripViews, permDimViews, slabGripViews } from '../interaction/hits.ts';
import { tempDimViews } from '../interaction/temp-layout.ts';
import { drawGrid } from './grid.ts';
import { PAPER_BG } from './paper.ts';
import { drawDrawing, drawPrimitive, type RenderContext } from './primitives.ts';
import { drawMain, drawRevealed, drawTrace } from './screen-layers.ts';
import { drawOptionsOf } from '../session/screen.ts';
import { AUX, drawGrips, drawOverlay, drawWallOutlines, FLASH, SELECT } from './overlay.ts';
import { drawLock, drawTempDim } from './overlay-dims.ts';

function drawModel(r: RenderContext, s: Session, model: Model, hidden: readonly string[]) {
  const drawing = drawView(model, s.viewId, drawOptionsOf(s.screen));
  const sel = new Set([...s.selection.dims, ...s.selection.levelDims]);
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
  drawMain(r, s, { scale: drawing.scale, primitives: plain });
  for (const [p, c] of marked) drawPrimitive(r, p, c);
  drawRevealed(r, s, model, drawing);
}

export function render(ctx: CanvasRenderingContext2D, s: Session) {
  const v = s.viewport;
  ctx.fillStyle = PAPER_BG[s.paper];
  ctx.fillRect(0, 0, v.width, v.height);
  if (s.options.grid) drawGrid(ctx, v, s.options.grid, s.paper);
  const o = s.tool.overlay();
  const hidden = o.hiddenDims ?? [];
  const r: RenderContext = {
    ctx,
    v,
    pens: s.model.display.penTable,
    scale: s.view.scale,
    paper: s.paper,
    hairline: !s.screen.trueWeight,
  };
  const model = o.previewModel ?? s.model;
  if (!s.screen.trace.over) drawTrace(r, s, model);
  drawModel(r, s, model, hidden);
  if (s.screen.trace.over) drawTrace(r, s, model);
  const sel = s.selection;
  drawWallOutlines(
    ctx,
    s,
    [...sel.walls, ...sel.openings, ...sel.slabs, ...sel.slabOpenings, ...sel.rooms],
    SELECT,
    2,
    model,
  );
  for (const d of o.draftDims ?? []) {
    const g = resolveGraphics(s.model.display, s.view, dimensionFacts(d)).effect;
    for (const p of drawDimension(s.model, d, s.view.scale, s.model.display.paperSizes, g))
      drawPrimitive(r, p, AUX);
  }
  for (const t of o.tempDims ?? []) drawTempDim(ctx, t);
  if (s.tool.id === 'select') {
    const flash = new Set(s.flashDims);
    // Zámeček jen u vybrané kóty (jako Revit) a u kóty, která právě brání změně (pokyn uživatele 2026-11-27).
    for (const d of permDimViews(s, hidden))
      if (s.selection.dims.includes(d.id) || flash.has(d.id)) drawLock(ctx, d, flash.has(d.id));
    for (const t of tempDimViews(s, model)) drawTempDim(ctx, t);
    drawGrips(ctx, [...gripViews(s), ...slabGripViews(s)]);
  }
  drawOverlay(ctx, s, o);
}

/** Neaktivní okno: jen kresba jeho pohledu (bez nástrojů, výběru a pomocných značek). */
export function renderPassive(ctx: CanvasRenderingContext2D, s: Session, index: number) {
  const w = s.windows[index];
  const view = w ? s.model.views[w.viewId] : undefined;
  if (!w || !view) return;
  ctx.fillStyle = PAPER_BG[s.paper];
  ctx.fillRect(0, 0, w.viewport.width, w.viewport.height);
  const r: RenderContext = {
    ctx,
    v: w.viewport,
    pens: s.model.display.penTable,
    scale: view.scale,
    paper: s.paper,
    hairline: !s.screen.trueWeight,
  };
  drawDrawing(r, drawView(s.model, view.id, drawOptionsOf(s.screen)));
}
