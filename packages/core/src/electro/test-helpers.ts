// Pomůcky testů elektra: stěna s osou v y = 0 (Zdivo 300, líce v ±150), pohled ve stylu podle názvu.
import type { Primitive } from '../drawing/primitives.ts';
import { vec } from '../geometry/index.ts';
import { fixture, type Fixture } from '../testing/fixture.ts';
import { drawView } from '../view/draw-view.ts';
import { electroTypeId } from './library.ts';

export const T = electroTypeId;

/** Projekt se stěnou (0,0) → (6000,0), referenční čára v ose; pohled ve stylu Elektro, 1:50. */
export function electroFixture(style = 'Elektro'): Fixture & { wallId: string } {
  const f = fixture();
  const wallId = f.line(vec(0, 0), vec(6000, 0), { referenceLine: 'axis' });
  f.run('view.setStyle', { viewId: f.viewId, styleId: f.style(style) });
  f.run('view.setScale', { viewId: f.viewId, scale: 50 });
  return Object.assign(f, { wallId });
}

/** Primitiva elektro prvku v pohledu. */
export function primitivesOf(f: Fixture, id: string, options = {}): Primitive[] {
  return drawView(f.model, f.viewId, options).primitives.filter((p) => p.source.elementId === id);
}

export const texts = (ps: readonly Primitive[]): string[] =>
  ps.flatMap((p) => (p.kind === 'text' ? [p.text] : []));

/** Obálka bodů primitiv (mm modelu). */
export function bbox(ps: readonly Primitive[]) {
  const pts = ps.flatMap((p) =>
    p.kind === 'line' ? p.points : p.kind === 'fill' ? p.polygon : p.kind === 'text' ? [p.at] : [],
  );
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}
