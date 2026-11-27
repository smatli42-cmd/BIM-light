// Nástroj Kóta u desek (desky D4): hrana nebo roh obrysu desky / otvoru v desce pod kurzorem. Roh má
// přednost (jako koncový bod při přichytávání), pak nejbližší hrana. Jen prvky, které jde v pohledu vybrat.
import { dist, nearestOnPath, type Vec2 } from '../geometry/index.ts';
import type { Model } from '../model/types.ts';
import { selectableSlabOpenings } from '../slab-opening/pick.ts';
import { selectableSlabs } from '../slab/pick.ts';
import type { View } from '../view/types.ts';
import type { OutlineRef } from './types.ts';

export interface OutlineHit {
  readonly ref: OutlineRef;
  /** Bod na hraně / roh (mm). */
  readonly point: Vec2;
  readonly distance: number;
}

interface Owner {
  readonly outline: OutlineRef['outline'];
  readonly id: string;
  readonly pts: readonly Vec2[];
}

function owners(model: Model, view: View): Owner[] {
  return [
    ...selectableSlabOpenings(model, view).map((o) => ({
      outline: 'slabOpening' as const,
      id: o.id,
      pts: o.outline,
    })),
    ...selectableSlabs(model, view).map((s) => ({ outline: 'slab' as const, id: s.id, pts: s.outline })),
  ];
}

/** Nejbližší roh, jinak hrana v toleranci (mm); otvory se zkouší před deskami. */
export function pickOutlineRef(model: Model, view: View, p: Vec2, tol: number): OutlineHit | null {
  let corner: OutlineHit | null = null;
  let edge: OutlineHit | null = null;
  for (const o of owners(model, view)) {
    o.pts.forEach((a, i) => {
      const d = dist(a, p);
      if (d <= tol && (!corner || d < corner.distance))
        corner = { ref: { outline: o.outline, ownerId: o.id, vertex: i }, point: a, distance: d };
      const b = o.pts[(i + 1) % o.pts.length] as Vec2;
      const h = nearestOnPath({ kind: 'line', start: a, end: b }, p);
      if (h.distance <= tol && (!edge || h.distance < edge.distance))
        edge = { ref: { outline: o.outline, ownerId: o.id, edge: i }, point: h.point, distance: h.distance };
    });
  }
  return corner ?? edge;
}
