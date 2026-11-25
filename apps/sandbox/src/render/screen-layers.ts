// Vrstvy kresby podle voleb okna (koncepce rozhraní, část 2 G): trasování jiného podlaží, izolované popisy
// (model v polotónu), odhalené skryté prvky (purpurově). Jen zobrazení, model se nemění.
import { allWalls, drawView, storeysOf, workingViewOf, type Drawing, type Model } from '@bim-light/core';
import type { Session } from '../session/session.ts';
import { TRACE_ALPHA } from '../session/screen.ts';
import { drawDrawing, type RenderContext } from './primitives.ts';
import { drawWallOutlines } from './overlay.ts';

export const REVEAL = '#b000c8';

/** Podlaží, které se trasuje (níž / výš podle úrovně, nebo zvolené), nebo null. */
export function traceStorey(s: Session): string | null {
  const t = s.screen.trace;
  if (t.ref !== 'below' && t.ref !== 'above')
    return s.model.storeys[t.ref] && t.ref !== s.storeyId ? t.ref : null;
  const stack = storeysOf(s.model, s.model.storeys[s.storeyId]?.buildingId ?? '');
  const i = stack.findIndex((st) => st.id === s.storeyId);
  return stack[t.ref === 'below' ? i - 1 : i + 1]?.id ?? null;
}

/** Průsvitná kresba odkazového podlaží (jeho pracovní okno, měřítko aktivního okna). */
export function drawTrace(r: RenderContext, s: Session, model: Model) {
  if (!s.screen.trace.on) return;
  const id = traceStorey(s);
  const v = id
    ? (workingViewOf(model, id) ?? Object.values(model.views).find((x) => x.storeyId === id))
    : null;
  if (!v) return;
  const d = drawView(model, v.id, { mergeMaterials: s.screen.mergeMaterials });
  r.ctx.save();
  r.ctx.globalAlpha = TRACE_ALPHA[s.screen.trace.intensity];
  drawDrawing(r, { scale: s.view.scale, primitives: d.primitives.filter((p) => !p.source.dimensionId) });
  r.ctx.restore();
}

/** Kresba aktivního okna; při izolovaných popisech je model v polotónu. */
export function drawMain(r: RenderContext, s: Session, d: Drawing) {
  if (!s.screen.isolate) return drawDrawing(r, d);
  const model = d.primitives.filter((p) => !p.source.dimensionId);
  r.ctx.save();
  r.ctx.globalAlpha = 0.3;
  drawDrawing(r, { ...d, primitives: model });
  r.ctx.restore();
  drawDrawing(r, { ...d, primitives: d.primitives.filter((p) => p.source.dimensionId) });
}

/** Odhalit: stěny podlaží, které kresba skryla (vrstvou, pravidlem), purpurovým obrysem. */
export function drawRevealed(r: RenderContext, s: Session, model: Model, drawn: Drawing) {
  if (!s.screen.reveal) return;
  const shown = new Set(drawn.primitives.map((p) => p.source.elementId));
  const hidden = allWalls(model)
    .filter((w) => w.storeyId === s.storeyId && !shown.has(w.id))
    .map((w) => w.id);
  r.ctx.setLineDash([6, 3]);
  drawWallOutlines(r.ctx, s, hidden, REVEAL, 1.5, model);
  r.ctx.setLineDash([]);
}
