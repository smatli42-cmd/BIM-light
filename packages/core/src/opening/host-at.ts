// Hostitel pod bodem (tažení, kopie a zrcadlení otvoru): stěna podlaží, v jejíž tloušťce bod leží.
import { dot, nearestOnPath, sub, type Vec2 } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import type { Model } from '../model/types.ts';
import { allWalls, wallSection } from '../wall/queries.ts';
import type { Wall } from '../wall/types.ts';
import { lengthAt, stationAt } from './along.ts';

export interface HostHit {
  readonly wall: Wall;
  /** Vzdálenost průmětu bodu od začátku referenční čáry (mm). */
  readonly s: number;
}

/** Stěna podlaží, v jejíž tloušťce bod leží (nejbližší ose), nebo null. Přednost má `prefer`. */
export function hostAt(model: Model, storeyId: Id, p: Vec2, prefer?: Id, tol = 1): HostHit | null {
  let best: { hit: HostHit; d: number } | null = null;
  for (const w of allWalls(model)) {
    if (w.storeyId !== storeyId) continue;
    const near = nearestOnPath(w.path, p);
    if (near.t <= 0 || near.t >= 1) continue;
    const s = lengthAt(w.path, near.point);
    const o = dot(sub(p, stationAt(w.path, s).point), stationAt(w.path, s).normal);
    const f = wallSection(model, w).faces;
    const lo = Math.min(f.ref, f.opp) - tol;
    const hi = Math.max(f.ref, f.opp) + tol;
    if (o < lo || o > hi) continue;
    const d = w.id === prefer ? -1 : Math.abs(o - f.axis);
    if (!best || d < best.d) best = { hit: { wall: w, s }, d };
  }
  return best?.hit ?? null;
}
