// Dočasné kóty vybrané stěny (katalog kreslení, část 3): příčně k nejbližšímu líci na každé
// straně, podélně délka líce. Měří se k lícům [R], osa je dostupná přepnutím.
import {
  add,
  carrierOf,
  cross,
  dot,
  intersect,
  mul,
  norm,
  onPath,
  pathLength,
  pointAt,
  sub,
  tangentAt,
  type Vec2,
} from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import type { WallGeometry } from '../wall/geometry.ts';
import type { WallFace } from '../wall/types.ts';
import type { FaceRef } from './types.ts';

export type TempMode = 'face' | 'axis';

export interface TempCrossDimension {
  readonly kind: 'cross';
  /** Líc vybrané stěny, od kterého se měří. */
  readonly own: FaceRef;
  readonly other: FaceRef;
  readonly from: Vec2;
  readonly to: Vec2;
  /** Směr od vybrané stěny k druhému líci. */
  readonly dir: Vec2;
  readonly value: number;
  /** Jsou líce rovnoběžné (jen pak jde udělat trvalou kótu)? */
  readonly parallel: boolean;
}

export interface TempLengthDimension {
  readonly kind: 'length';
  readonly own: FaceRef;
  readonly value: number;
}

export type TempDimension = TempCrossDimension | TempLengthDimension;

interface RayHit {
  readonly s: number;
  readonly point: Vec2;
  readonly ref: FaceRef;
  readonly parallel: boolean;
}

function rayHit(o: Vec2, d: Vec2, g: WallGeometry, face: WallFace, tan: Vec2): RayHit | null {
  const path = g.faces[face];
  const ray = { kind: 'line' as const, p: o, d };
  let best: RayHit | null = null;
  for (const q of intersect(ray, carrierOf(path))) {
    const s = dot(sub(q, o), d);
    if (s <= 1e-6 || !onPath(path, q, 1)) continue;
    const parallel = path.kind === 'line' && Math.abs(cross(tangentAt(path, 'start'), tan)) < 0.01;
    if (!best || s < best.s) best = { s, point: q, ref: { wallId: g.wallId, face }, parallel };
  }
  return best;
}

function nearestHit(o: Vec2, d: Vec2, others: readonly WallGeometry[], faces: WallFace[], tan: Vec2) {
  let best: RayHit | null = null;
  for (const g of others)
    for (const f of faces) {
      const h = rayHit(o, d, g, f, tan);
      if (h && (!best || h.s < best.s)) best = h;
    }
  return best;
}

/** Dočasné kóty pro jednu vybranou stěnu. */
export function temporaryDimensions(
  wall: WallGeometry,
  others: readonly WallGeometry[],
  mode: TempMode = 'face',
): TempDimension[] {
  const out: TempDimension[] = [];
  const refMid = pointAt(wall.faces.ref, 0.5);
  const oppMid = pointAt(wall.faces.opp, 0.5);
  const out1 = norm(sub(refMid, oppMid));
  const sides: [WallFace, Vec2][] =
    mode === 'axis'
      ? [
          ['axis', out1],
          ['axis', mul(out1, -1)],
        ]
      : [
          ['ref', out1],
          ['opp', mul(out1, -1)],
        ];
  const faces: WallFace[] = mode === 'axis' ? ['axis'] : ['ref', 'opp'];
  const rest = others.filter((g) => g.wallId !== wall.wallId);
  for (const [face, dir] of sides) {
    const path = wall.faces[face];
    const from = pointAt(path, 0.5);
    const tan = tangentAt(path, 'start');
    const hit = nearestHit(add(from, mul(dir, 0)), dir, rest, faces, tan);
    if (!hit) continue;
    const own = { wallId: wall.wallId, face };
    out.push({
      kind: 'cross',
      own,
      other: hit.ref,
      from,
      to: hit.point,
      dir,
      value: hit.s,
      parallel: hit.parallel,
    });
  }
  out.push({ kind: 'length', own: { wallId: wall.wallId, face: 'ref' }, value: pathLength(wall.faces.ref) });
  return out;
}

/** Id stěny, kterou dočasná kóta posouvá (vždy vybraná stěna, základ 25). */
export const tempMover = (t: TempDimension): Id => t.own.wallId;
