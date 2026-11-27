// Výběr desky (pravidla-interakce: Výběr): klik do obrysu nebo na hranu v toleranci. Desky leží pod
// stěnami, proto je výběr sandbox zkouší až po stěnách a otvorech. Body v mm modelu.
import { nearestOnPath, type Vec2 } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import type { Model } from '../model/types.ts';
import { pointInPolygon } from '../selection/pick.ts';
import { isSelectable } from '../view/draw-view.ts';
import type { View } from '../view/types.ts';
import { slabLevels } from './geometry.ts';
import { allSlabs } from './queries.ts';
import type { Slab } from './types.ts';

/** Desky pohledu, které jde vybrat (podlaží pohledu, vrstva viditelná a nezamčená, hlavní varianta). */
export const selectableSlabs = (model: Model, view: View): Slab[] =>
  allSlabs(model).filter((s) => s.variant.kind === 'main' && isSelectable(model, view, s.id));

/** Hrany obrysu jako úsečky. */
export const slabEdges = (s: Slab): [Vec2, Vec2][] =>
  s.outline.map((p, i) => [p, s.outline[(i + 1) % s.outline.length] as Vec2]);

/** Leží bod v ploše desky (uvnitř obrysu, mimo ostrovy)? */
export const pointInSlab = (s: Slab, p: Vec2): boolean =>
  pointInPolygon(p, s.outline) && !(s.holes ?? []).some((h) => pointInPolygon(p, h));

const nearEdge = (s: Slab, p: Vec2, tol: number) =>
  slabEdges(s).some(([a, b]) => nearestOnPath({ kind: 'line', start: a, end: b }, p).distance <= tol);

/** Desky pod bodem; nejvýš položená (horní líc) první – podlaha před stropem pod ní. Tab je střídá. */
export function slabsAt(model: Model, view: View, p: Vec2, tol: number): Id[] {
  return selectableSlabs(model, view)
    .filter((s) => pointInSlab(s, p) || nearEdge(s, p, tol))
    .sort((a, b) => slabLevels(model, b).top - slabLevels(model, a).top)
    .map((s) => s.id);
}
