// Okótování celé stěny (pravidla-interakce: „Okótování celé stěny“; plán stěn Z4): podél zvoleného líce
// řetěz líc – hrana otvoru – … – líc a pod ním celková délka (Archicad: automatické kótování).
// Volba `walls` (pokyn uživatele 2026-11-26, Revit „Entire Walls: Intersecting Walls“) přidá do řetězu
// i tloušťky rohových stěn a líce napojených příček a křížících stěn – šířky všech stěn.
import {
  add,
  cross,
  dot,
  mul,
  norm,
  pathLength,
  pointAt,
  sub,
  tangentAt,
  type Vec2,
} from '../geometry/index.ts';
import { connectionsOf, sidesFor } from '../wall/queries.ts';
import { facePath } from './measure.ts';
import { stationAt } from '../opening/along.ts';
import type { Id } from '../ids/index.ts';
import type { Model } from '../model/types.ts';
import { openingsOf } from '../opening/geometry.ts';
import { wallEndLimit } from '../opening/limits.ts';
import { wallGeometry } from '../wall/geometry.ts';
import { getWall } from '../wall/queries.ts';
import type { FaceRef } from './types.ts';

export interface WholeWallRows {
  /** Řetěz: dvojice sousedních hran (líc – hrana otvoru – … – líc). */
  readonly chain: readonly (readonly [FaceRef, FaceRef])[];
  /** Celková délka (líc – líc); null u stěny bez otvorů (řetěz je pak celková délka). */
  readonly total: readonly [FaceRef, FaceRef] | null;
  /** Body, kterými vedou kótovací čáry řetězu a celkové délky. */
  readonly chainPoint: Vec2;
  readonly totalPoint: Vec2;
}

const other = (f: 'ref' | 'opp'): 'ref' | 'opp' => (f === 'ref' ? 'opp' : 'ref');
const isFace = (f: FaceRef['face']): f is 'ref' | 'opp' => f === 'ref' || f === 'opp';

/**
 * Líce stěn kolmých na kótovanou: druhý líc rohové stěny na každém konci (její tloušťka) a oba líce
 * příček a křížících stěn napojených po délce. Jen u přímé stěny (u oblouku zatím ne).
 */
function wallEdges(model: Model, wallId: Id, limits: readonly FaceRef[]): FaceRef[] {
  const w = getWall(model, wallId);
  if (w.path.kind !== 'line') return [];
  const dir = tangentAt(w.path, 'start');
  const square = (r: FaceRef) => Math.abs(cross(tangentAt(facePath(model, r), 'start'), dir)) > 0.999;
  const out: FaceRef[] = limits.flatMap((l) =>
    l.wallId !== wallId && isFace(l.face) ? [{ wallId: l.wallId, face: other(l.face) }] : [],
  );
  for (const c of connectionsOf(model, wallId)) {
    const sd = sidesFor(c, wallId);
    if (sd.own.at !== 'ATPATH' || !model.elements[sd.other.wallId]) continue;
    out.push({ wallId: sd.other.wallId, face: 'ref' }, { wallId: sd.other.wallId, face: 'opp' });
  }
  return out.filter(square);
}

/** Hrany seřazené podél stěny mezi koncovými líci; hrany ve stejném místě (do 1 mm) jen jednou. */
function ordered(
  model: Model,
  wallId: Id,
  start: FaceRef,
  end: FaceRef,
  inner: readonly FaceRef[],
): FaceRef[] {
  const p = getWall(model, wallId).path;
  const dir = norm(sub(p.end, p.start));
  const at = (r: FaceRef) => dot(sub(pointAt(facePath(model, r), 0.5), p.start), dir);
  if (p.kind !== 'line') return [start, ...inner, end];
  const [s0, s1] = [at(start), at(end)];
  const lo = Math.min(s0, s1);
  const hi = Math.max(s0, s1);
  const sign = s1 >= s0 ? 1 : -1;
  const mid = inner
    .map((r) => ({ r, s: at(r) }))
    .filter((x) => x.s > lo + 1 && x.s < hi - 1)
    .sort((a, b) => sign * (a.s - b.s));
  const out: FaceRef[] = [start];
  let last = s0;
  for (const x of mid) {
    if (Math.abs(x.s - last) <= 1) continue;
    out.push(x.r);
    last = x.s;
  }
  if (Math.abs(s1 - last) > 1 || out.length === 1) out.push(end);
  else out[out.length - 1] = end;
  return out;
}

/** Řady kót celé stěny na líci `side`, čáry ve vzdálenosti `distance` a `distance + step` od líce. */
export function wholeWallRows(
  model: Model,
  wallId: Id,
  side: 'ref' | 'opp',
  distance: number,
  step: number,
  opts: { walls?: boolean } = {},
): WholeWallRows | null {
  const start = wallEndLimit(model, wallId, 'start', side);
  const end = wallEndLimit(model, wallId, 'end', side);
  if (!start || !end) return null;
  const inner: FaceRef[] = [];
  for (const o of openingsOf(model, wallId))
    inner.push({ wallId, face: 'start', openingId: o.id }, { wallId, face: 'end', openingId: o.id });
  if (opts.walls) inner.push(...wallEdges(model, wallId, [start, end]));
  const edges = ordered(model, wallId, start, end, inner);
  const chain = edges.slice(1).map((e, i) => [edges[i] as FaceRef, e] as const);
  const g = wallGeometry(model, getWall(model, wallId));
  const face = g.faces[side];
  const f = g.section.faces;
  const st = stationAt(face, pathLength(face) / 2);
  const out = mul(st.normal, Math.sign(f[side] - f[side === 'ref' ? 'opp' : 'ref']) || 1);
  const mid = st.point;
  return {
    chain,
    total: edges.length > 2 ? [start, end] : null,
    chainPoint: add(mid, mul(out, distance)),
    totalPoint: add(mid, mul(out, distance + step)),
  };
}
