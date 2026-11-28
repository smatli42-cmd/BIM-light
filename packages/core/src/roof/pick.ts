// Výběr střechy v půdorysu (pravidla-interakce: Výběr): klik do půdorysu některé roviny (i s přesahem)
// nebo na hranu střechy v toleranci. Body v mm modelu.
import { nearestOnPath, type Vec2 } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import type { Model } from '../model/types.ts';
import { pointInPolygon } from '../selection/pick.ts';
import { isSelectable } from '../view/draw-view.ts';
import type { View } from '../view/types.ts';
import { roofGeometry } from './planes.ts';
import { allRoofs } from './queries.ts';

/** Střechy pod bodem (`inside` = i klik do plochy, jinak jen na hranu; podlaží pohledu, vrstva viditelná a nezamčená, hlavní varianta). */
export function roofsAt(model: Model, view: View, p: Vec2, tol: number, inside = true): Id[] {
  return allRoofs(model)
    .filter((r) => r.variant.kind === 'main' && isSelectable(model, view, r.id))
    .filter((r) => {
      const g = roofGeometry(model, r);
      if (inside && g.planes.some((q) => pointInPolygon(p, q.polygon))) return true;
      return g.lines.some((l) => nearestOnPath({ kind: 'line', start: l.a, end: l.b }, p).distance <= tol);
    })
    .map((r) => r.id);
}
