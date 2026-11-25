// Hrany otvoru pro kóty a přichytávání (plán stěn Z4): hrana = příčná úsečka přes stěnu v místě počátku
// ('start') nebo konce ('end') otvoru; u niky jen do její hloubky. Hrana leží v rovině stavebního
// otvoru (jádra), proto se po změně tloušťky nebo skladby nehýbe vůči referenční čáře.
import type { Path } from '../geometry/index.ts';
import type { Model } from '../model/types.ts';
import { getWall, wallSection } from '../wall/queries.ts';
import { pointAtStation } from './along.ts';
import { openingSpan } from './geometry.ts';
import type { Opening } from './types.ts';

export type OpeningEdge = 'start' | 'end';

/** Offsety (od, do) příčné úsečky otvoru: celá tloušťka, u niky jen hloubka od líce. */
export function openingAcross(model: Model, o: Opening): [number, number] {
  const f = wallSection(model, getWall(model, o.hostId)).faces;
  if (o.kind !== 'niche') return [f.ref, f.opp];
  const face = o.side === 'ref' ? f.ref : f.opp;
  const other = o.side === 'ref' ? f.opp : f.ref;
  return [face, face + Math.sign(other - face) * o.depth];
}

export function openingEdgePath(model: Model, o: Opening, edge: OpeningEdge): Path {
  const host = getWall(model, o.hostId);
  const { s0, s1 } = openingSpan(o);
  const s = edge === 'start' ? s0 : s1;
  const [a, b] = openingAcross(model, o);
  return { kind: 'line', start: pointAtStation(host.path, s, a), end: pointAtStation(host.path, s, b) };
}
