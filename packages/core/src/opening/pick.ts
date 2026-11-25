// Výběr a přichytávání otvoru (plán stěn Z4, základ 20: společná služba pro všechny prvky).
import { endPoint, nearestOnPath, pathLength, type Vec2 } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import type { Model } from '../model/types.ts';
import { pointInPolygon } from '../selection/pick.ts';
import { isSelectable } from '../view/draw-view.ts';
import type { View } from '../view/types.ts';
import { wallGeometry } from '../wall/geometry.ts';
import { getWall } from '../wall/queries.ts';
import { lengthAt, stationAt } from './along.ts';
import { openingOutline } from './draw.ts';
import { openingsOf } from './geometry.ts';
import type { Opening } from './types.ts';

/** Otvor pod bodem (uvnitř jeho obrysu v tloušťce stěny, nebo do `tol` od něj), nebo null. */
export function openingAt(model: Model, view: View, p: Vec2, tol: number): Id | null {
  for (const o of Object.values(model.openings)) {
    if (!isSelectable(model, view, o.id) || o.variant.kind !== 'main') continue;
    const poly = openingOutline(model, o);
    if (pointInPolygon(p, poly)) return o.id;
    const edges = poly.map((a, i) => ({
      kind: 'line' as const,
      start: a,
      end: poly[(i + 1) % poly.length] as Vec2,
    }));
    if (edges.some((e) => nearestOnPath(e, p).distance <= tol)) return o.id;
  }
  return null;
}

export interface OpeningSnap {
  /** Poloha počátku otvoru po přichycení (mm od začátku referenční čáry). */
  readonly offset: number;
  /** Popisek přichycení, nebo null (bez přichycení). */
  readonly label: string | null;
}

/**
 * Přichycení otvoru šířky `width` se středem v `s` (mm po stěně): ke středu stěny, hranou k líci, který
 * stěnu ohraničuje (roh, T), hranou k sousednímu otvoru a osou k ose jiného otvoru podlaží.
 */
export function snapOpening(
  model: Model,
  wallId: Id,
  s: number,
  width: number,
  tol: number,
  exclude?: Id,
): OpeningSnap {
  const wall = getWall(model, wallId);
  const g = wallGeometry(model, wall);
  const free = s - width / 2;
  const cands: { offset: number; label: string }[] = [
    { offset: pathLength(wall.path) / 2 - width / 2, label: 'střed stěny' },
  ];
  for (const side of ['ref', 'opp'] as const) {
    cands.push({ offset: lengthAt(wall.path, endPoint(g.faces[side], 'start')), label: 'líc' });
    cands.push({ offset: lengthAt(wall.path, endPoint(g.faces[side], 'end')) - width, label: 'líc' });
  }
  for (const o of openingsOf(model, wallId)) {
    if (o.id === exclude) continue;
    cands.push({ offset: o.offset + o.width, label: 'otvor' }, { offset: o.offset - width, label: 'otvor' });
  }
  for (const o of Object.values(model.openings)) {
    if (o.id === exclude || o.hostId === wallId || o.storeyId !== wall.storeyId) continue;
    const c = centerOf(model, o);
    cands.push({ offset: lengthAt(wall.path, c) - width / 2, label: 'osa otvoru' });
  }
  let best: OpeningSnap = { offset: free, label: null };
  let d = tol;
  for (const c of cands)
    if (Math.abs(c.offset - free) <= d) {
      d = Math.abs(c.offset - free);
      best = c;
    }
  return best;
}

/** Střed otvoru na referenční čáře hostitele. */
export const centerOf = (model: Model, o: Opening): Vec2 =>
  stationAt(getWall(model, o.hostId).path, o.offset + o.width / 2).point;
