// Výběr otvoru v desce (D3): klik do obrysu nebo na hranu; zkouší se před deskou, ve které leží.
import { nearestOnPath, type Vec2 } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import type { Model } from '../model/types.ts';
import { pointInPolygon } from '../selection/pick.ts';
import { isSelectable } from '../view/draw-view.ts';
import type { View } from '../view/types.ts';
import { allSlabOpenings } from './geometry.ts';
import type { SlabOpening } from './types.ts';

export const selectableSlabOpenings = (model: Model, view: View): SlabOpening[] =>
  allSlabOpenings(model).filter((o) => o.variant.kind === 'main' && isSelectable(model, view, o.id));

const nearEdge = (o: SlabOpening, p: Vec2, tol: number) =>
  o.outline.some(
    (a, i) =>
      nearestOnPath({ kind: 'line', start: a, end: o.outline[(i + 1) % o.outline.length] as Vec2 }, p)
        .distance <= tol,
  );

export function slabOpeningsAt(model: Model, view: View, p: Vec2, tol: number): Id[] {
  return selectableSlabOpenings(model, view)
    .filter((o) => pointInPolygon(p, o.outline) || nearEdge(o, p, tol))
    .map((o) => o.id);
}
