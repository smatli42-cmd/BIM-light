// Samočinné napojení konce stěny (základ 24), stejné pro myš i pro AI: konec na volném konci
// jiné stěny = roh (ATSTART / ATEND), konec na líci nebo ose jiné stěny = T napojení (ATPATH).
import { dist, endPoint, nearestOnPath, type PathEnd, type Vec2 } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import type { Model } from '../model/types.ts';
import type { ConnectionType } from '../relation/types.ts';
import { allWallGeometry } from './geometry.ts';
import { allWalls, connectionsOf, endToType, sidesFor } from './queries.ts';

/** Tolerance shody bodu (mm). */
export const CONNECT_TOL = 1;

export interface AutoLink {
  readonly wallId: Id;
  readonly at: ConnectionType;
}

/** Je konec stěny volný (bez napojení)? */
export const isFreeEnd = (m: Model, wallId: Id, end: PathEnd): boolean =>
  !connectionsOf(m, wallId).some((c) => sidesFor(c, wallId).own.at === endToType(end));

/** Kam se napojí konec ležící v bodě `p` na podlaží; null = nikam. Roh má přednost před T. */
export function connectionAt(
  model: Model,
  storeyId: Id,
  p: Vec2,
  exclude: readonly Id[] = [],
): AutoLink | null {
  const walls = allWalls(model).filter((w) => w.storeyId === storeyId && !exclude.includes(w.id));
  for (const w of walls)
    for (const end of ['start', 'end'] as const) {
      if (dist(endPoint(w.path, end), p) <= CONNECT_TOL && isFreeEnd(model, w.id, end))
        return { wallId: w.id, at: endToType(end) };
    }
  const geoms = allWallGeometry(model, storeyId);
  for (const w of walls) {
    const g = geoms.get(w.id);
    if (!g) continue;
    const on = (['ref', 'opp', 'axis'] as const).some(
      (f) => nearestOnPath(g.faces[f], p).distance <= CONNECT_TOL,
    );
    if (on) return { wallId: w.id, at: 'ATPATH' };
  }
  return null;
}
