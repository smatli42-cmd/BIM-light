// Okótování celé stěny (pravidla-interakce: „Okótování celé stěny“; plán stěn Z4): podél zvoleného líce
// řetěz líc – hrana otvoru – … – líc a pod ním celková délka (Archicad: automatické kótování).
import { add, leftNormal, mul, pointAt, tangentAt, type Vec2 } from '../geometry/index.ts';
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

/** Řady kót celé stěny na líci `side`, čáry ve vzdálenosti `distance` a `distance + step` od líce. */
export function wholeWallRows(
  model: Model,
  wallId: Id,
  side: 'ref' | 'opp',
  distance: number,
  step: number,
): WholeWallRows | null {
  const start = wallEndLimit(model, wallId, 'start', side);
  const end = wallEndLimit(model, wallId, 'end', side);
  if (!start || !end) return null;
  const edges: FaceRef[] = [start];
  for (const o of openingsOf(model, wallId))
    edges.push({ wallId, face: 'start', openingId: o.id }, { wallId, face: 'end', openingId: o.id });
  edges.push(end);
  const chain = edges.slice(1).map((e, i) => [edges[i] as FaceRef, e] as const);
  const g = wallGeometry(model, getWall(model, wallId));
  const face = g.faces[side];
  const f = g.section.faces;
  const out = mul(
    leftNormal(tangentAt(face, 'start')),
    Math.sign(f[side] - f[side === 'ref' ? 'opp' : 'ref']) || 1,
  );
  const mid = pointAt(face, 0.5);
  return {
    chain,
    total: edges.length > 2 ? [start, end] : null,
    chainPoint: add(mid, mul(out, distance)),
    totalPoint: add(mid, mul(out, distance + step)),
  };
}
