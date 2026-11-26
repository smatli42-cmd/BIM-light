// Zásah do hrany otvoru (kóty, hlášení uživatele 2026-11-26): hrana = příčná úsečka přes stěnu v místě
// počátku a konce otvoru, u niky jen do její hloubky (opening/edges.ts). Platí pro každý otvor, který
// pohled ukazuje – i bouraný otvor a niku. Otvor skrytý filtrem rekonstrukce chytit nejde.
import { nearestOnPath, type Vec2 } from '../geometry/index.ts';
import type { Model } from '../model/types.ts';
import { openingFacts } from '../opening/draw.ts';
import { openingEdgePath, type OpeningEdge } from '../opening/edges.ts';
import { resolveGraphics } from '../style/graphics.ts';
import { categoryState } from '../view/effective.ts';
import { isSelectable } from '../view/draw-view.ts';
import type { View } from '../view/types.ts';
import type { FaceHit } from './pick.ts';

const EDGES: readonly OpeningEdge[] = ['start', 'end'];

/** Nejbližší hrana viditelného otvoru v toleranci, nebo null. */
export function pickOpeningEdge(model: Model, view: View, p: Vec2, tol: number): FaceHit | null {
  if (!categoryState(model.display, view, 'opening').visible) return null;
  let best: FaceHit | null = null;
  for (const o of Object.values(model.openings)) {
    if (o.storeyId !== view.storeyId || o.variant.kind !== 'main') continue;
    if (!isSelectable(model, view, o.hostId)) continue;
    if (!resolveGraphics(model.display, view, openingFacts(o)).effect.visible) continue;
    for (const face of EDGES) {
      const h = nearestOnPath(openingEdgePath(model, o, face), p);
      if (h.distance <= tol && (!best || h.distance < best.distance))
        best = { wallId: o.hostId, face, openingId: o.id, point: h.point, t: h.t, distance: h.distance };
    }
  }
  return best;
}
