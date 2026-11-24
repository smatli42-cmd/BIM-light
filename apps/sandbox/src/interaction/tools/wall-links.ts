// Napojení nové stěny na existující (základ 24): konec na volném konci jiné stěny = roh,
// konec na líci / ose jiné stěny = T napojení (ATPATH).
import {
  bandThickness,
  connectionsOf,
  dist,
  endPoint,
  endToType,
  nearestOnPath,
  allWallGeometry,
  sidesFor,
  type Id,
  type Model,
  type Vec2,
} from '@bim-light/core';
import type { Session } from '../../session/session.ts';

export interface Link {
  readonly wallId: Id;
  readonly at: 'ATSTART' | 'ATEND' | 'ATPATH';
}

const TOL = 1;

/** Kam se napojí konec nové stěny ležící v bodě `p` (nebo null). */
export function connectionAt(s: Session, p: Vec2, exclude: readonly Id[]): Link | null {
  const m = s.model;
  const geoms = allWallGeometry(m, s.storeyId);
  for (const g of geoms.values()) {
    if (exclude.includes(g.wallId)) continue;
    const w = m.elements[g.wallId];
    if (!w) continue;
    for (const end of ['start', 'end'] as const) {
      if (dist(endPoint(w.path, end), p) > TOL) continue;
      const busy = connectionsOf(m, w.id).some((c) => sidesFor(c, w.id).own.at === endToType(end));
      if (!busy) return { wallId: w.id, at: endToType(end) as 'ATSTART' | 'ATEND' };
    }
  }
  for (const g of geoms.values()) {
    if (exclude.includes(g.wallId)) continue;
    const onIt = (['ref', 'opp', 'axis'] as const).some((f) => nearestOnPath(g.faces[f], p).distance <= TOL);
    if (onIt) return { wallId: g.wallId, at: 'ATPATH' };
  }
  return null;
}

/** Tloušťka typu stěny (první pás) pro náhled. */
export function typeThickness(model: Model, typeId: Id): number {
  const band = model.wallTypes[typeId]?.bands[0];
  return band ? bandThickness(band) : 0;
}
