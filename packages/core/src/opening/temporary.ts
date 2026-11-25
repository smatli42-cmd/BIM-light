// Dočasné kóty vybraného otvoru (plán stěn Z4; katalog kreslení, část 3): od hran otvoru po stěně
// k nejbližší hraně na každé straně – sousední otvor, nebo líc / čelo, které stěnu na konci ohraničuje.
// Klik na číslo posune otvor (dimension.setValue po vytvoření kóty, nebo opening.move).
import { add, mul, type Vec2 } from '../geometry/index.ts';
import { faceDistance } from '../dimension/measure.ts';
import type { TempCrossDimension } from '../dimension/temporary.ts';
import type { FaceRef } from '../dimension/types.ts';
import type { Id } from '../ids/index.ts';
import type { Model } from '../model/types.ts';
import { wallSection, getWall } from '../wall/queries.ts';
import { pointAtStation, stationAt } from './along.ts';
import { openingsOf, openingSpan } from './geometry.ts';
import { wallEndLimit } from './limits.ts';

/** Dočasné kóty otvoru na líci `side` stěny (výchozí protilehlý). */
export function openingTempDimensions(
  model: Model,
  openingId: Id,
  side: 'ref' | 'opp' = 'opp',
): TempCrossDimension[] {
  const o = model.openings[openingId];
  if (!o) return [];
  const wall = getWall(model, o.hostId);
  const list = openingsOf(model, wall.id);
  const i = list.findIndex((x) => x.id === o.id);
  const prev = list[i - 1];
  const next = list[i + 1];
  const edge = (id: Id, face: 'start' | 'end'): FaceRef => ({ wallId: wall.id, face, openingId: id });
  const before = prev ? edge(prev.id, 'end') : wallEndLimit(model, wall.id, 'start', side);
  const after = next ? edge(next.id, 'start') : wallEndLimit(model, wall.id, 'end', side);
  const v = wallSection(model, wall).faces[side];
  const { s0, s1 } = openingSpan(o);
  const make = (own: FaceRef, other: FaceRef | null, s: number, sign: -1 | 1): TempCrossDimension[] => {
    if (!other) return [];
    const value = faceDistance(model, own, other);
    const from: Vec2 = pointAtStation(wall.path, s, v);
    const dir = mul(stationAt(wall.path, s).tangent, sign);
    return [{ kind: 'cross', own, other, from, to: add(from, mul(dir, value)), dir, value, parallel: true }];
  };
  return [...make(edge(o.id, 'start'), before, s0, -1), ...make(edge(o.id, 'end'), after, s1, 1)];
}
