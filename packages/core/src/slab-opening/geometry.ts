// Geometrie otvoru v desce: překryv obrysů (které desky otvor prořízne) a čistá plocha desky.
import { cross, sub, type Vec2 } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import type { Model } from '../model/types.ts';
import { pointInPolygon } from '../selection/pick.ts';
import { polygonArea, slabArea } from '../slab/geometry.ts';
import { allSlabs } from '../slab/queries.ts';
import type { Slab } from '../slab/types.ts';
import type { SlabOpening } from './types.ts';

const edges = (p: readonly Vec2[]) => p.map((a, i) => [a, p[(i + 1) % p.length] as Vec2] as const);

function properCross(a: Vec2, b: Vec2, c: Vec2, d: Vec2): boolean {
  const d1 = cross(sub(b, a), sub(c, a));
  const d2 = cross(sub(b, a), sub(d, a));
  const d3 = cross(sub(d, c), sub(a, c));
  const d4 = cross(sub(d, c), sub(b, c));
  return d1 * d2 < 0 && d3 * d4 < 0;
}

/** Mají dva mnohoúhelníky společnou plochu? (vrchol uvnitř druhého nebo křížení hran) */
export function polygonsOverlap(p: readonly Vec2[], q: readonly Vec2[]): boolean {
  if (p.some((v) => pointInPolygon(v, q)) || q.some((v) => pointInPolygon(v, p))) return true;
  return edges(p).some(([a, b]) => edges(q).some(([c, d]) => properCross(a, b, c, d)));
}

/** Desky podlaží (hlavní model), které obrys otvoru zasáhne – nosná deska i podlaha. */
export function slabsUnder(model: Model, storeyId: Id, outline: readonly Vec2[]): Slab[] {
  return allSlabs(model).filter(
    (s) => s.storeyId === storeyId && s.variant.kind === 'main' && polygonsOverlap(s.outline, outline),
  );
}

export const allSlabOpenings = (model: Model): SlabOpening[] => Object.values(model.slabOpenings);

/** Otvory, které desku prořezávají. */
export const slabOpeningsOf = (model: Model, slabId: Id): SlabOpening[] =>
  allSlabOpenings(model).filter((o) => o.hostIds.includes(slabId));

/**
 * Čistá plocha desky bez otvorů (mm²). Otvor se odečte celou plochou; otvor přesahující okraj desky se
 * zatím neořezává (D3, k potvrzení).
 */
export function slabNetArea(model: Model, s: Slab): number {
  const holes = slabOpeningsOf(model, s.id).reduce((a, o) => a + polygonArea(o.outline), 0);
  return Math.max(0, slabArea(s) - holes);
}
