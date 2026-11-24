// Zásah do kresby (pravidla-interakce: Výběr). Body jsou v mm modelu; tolerance = px / zvětšení.
import { nearestOnPath, type Vec2 } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import type { Model } from '../model/types.ts';
import { isSelectable } from '../view/draw-view.ts';
import type { View } from '../view/types.ts';
import { allWallGeometry, type WallGeometry } from '../wall/geometry.ts';
import type { WallFace } from '../wall/types.ts';

/** Leží bod uvnitř mnohoúhelníku? (paprsková metoda) */
export function pointInPolygon(p: Vec2, poly: readonly Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i] as Vec2;
    const b = poly[j] as Vec2;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** Geometrie stěn pohledu, které jde vybrat (vrstva viditelná a nezamčená). */
export function selectableWallGeometry(model: Model, view: View): WallGeometry[] {
  return [...allWallGeometry(model, view.storeyId).values()].filter((g) =>
    isSelectable(model, view, g.wallId),
  );
}

/**
 * Stěny pod bodem, nejvrchnější (naposledy nakreslená) první. Tab mezi nimi střídá.
 * Do obrysu se počítá i okraj v toleranci.
 */
export function wallsAt(geoms: readonly WallGeometry[], p: Vec2, tol: number): Id[] {
  const out: Id[] = [];
  for (const g of geoms) {
    const onEdge = (['ref', 'opp'] as const).some((f) => nearestOnPath(g.faces[f], p).distance <= tol);
    if (onEdge || pointInPolygon(p, g.outline)) out.push(g.wallId);
  }
  return out.reverse();
}

export interface FaceHit {
  readonly wallId: Id;
  readonly face: WallFace;
  readonly point: Vec2;
  /** Parametr 0..1 podél líce. */
  readonly t: number;
  readonly distance: number;
}

/** Nejbližší líc v toleranci (pravidla-interakce, kóty 7: tolerance 12 px). */
export function pickFace(
  geoms: readonly WallGeometry[],
  p: Vec2,
  tol: number,
  faces: readonly WallFace[] = ['ref', 'opp'],
): FaceHit | null {
  let best: FaceHit | null = null;
  for (const g of geoms) {
    for (const face of faces) {
      const h = nearestOnPath(g.faces[face], p);
      if (h.distance <= tol && (!best || h.distance < best.distance)) {
        best = { wallId: g.wallId, face, point: h.point, t: h.t, distance: h.distance };
      }
    }
  }
  return best;
}
