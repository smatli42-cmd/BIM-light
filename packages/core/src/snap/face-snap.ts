// Líc při kreslení: (1) úhlový krok trvá i na protějším líci – bod = průsečík paprsku „rovně / pravý úhel“
// s lícem; (2) bod na líci se zaokrouhlí na 10 mm (délka od předchozího bodu, jinak poloha po líci).
import {
  add,
  dist,
  dot,
  len,
  mul,
  pathIntersections,
  sub,
  tangentAt,
  type Path,
  type Vec2,
} from '../geometry/index.ts';
import type { WallGeometry } from '../wall/geometry.ts';
import type { WallFace } from '../wall/types.ts';
import { ANGLE_SNAP_DEG, ROUND_STEP, type SnapCandidate } from './types.ts';
import { nearestStep, roundTo } from './angle.ts';

const RAD = Math.PI / 180;
const OUTER: readonly WallFace[] = ['ref', 'opp'];
const FAR = 1e7;

/** Bod na přímém líci zaokrouhlený na 10 mm; s předchozím bodem se zaokrouhluje délka. */
export function roundOnFace(face: Path, p: Vec2, from: Vec2 | null): Vec2 {
  if (face.kind !== 'line') return p;
  const d = tangentAt(face, 'start');
  const l = dist(face.start, face.end);
  if (!from) {
    const t = roundTo(dot(sub(p, face.start), d));
    return t >= 0 && t <= l ? add(face.start, mul(d, t)) : p;
  }
  const r = roundTo(dist(from, p));
  const t0 = dot(sub(from, face.start), d);
  const foot = add(face.start, mul(d, t0));
  const h = dist(from, foot);
  if (r < h) return p;
  const w = Math.sqrt(r * r - h * h);
  const tp = dot(sub(p, face.start), d);
  const t = Math.abs(t0 + w - tp) < Math.abs(t0 - w - tp) ? t0 + w : t0 - w;
  const maxShift = (ROUND_STEP * r) / Math.max(w, 1e-9);
  return t >= 0 && t <= l && Math.abs(t - tp) <= maxShift ? add(face.start, mul(d, t)) : p;
}

export interface RayOptions {
  readonly from: Vec2;
  readonly prevDir: number | null;
  readonly orthoOnly: boolean;
  readonly priority: number;
}

/** Průsečíky paprsku úhlového kroku s líci v dosahu kurzoru („líc + rovně“). */
export function rayFaceCandidates(
  geoms: readonly WallGeometry[],
  raw: Vec2,
  tol: number,
  o: RayOptions,
): SnapCandidate[] {
  const v = sub(raw, o.from);
  if (len(v) < 1e-6) return [];
  const st = nearestStep(Math.atan2(v.y, v.x), o.prevDir, o.orthoOnly);
  if (!o.orthoOnly && st.diff > ANGLE_SNAP_DEG * RAD) return [];
  const u = { x: Math.cos(st.angle), y: Math.sin(st.angle) };
  const ray: Path = { kind: 'line', start: o.from, end: add(o.from, mul(u, FAR)) };
  const out: SnapCandidate[] = [];
  for (const g of geoms)
    for (const f of OUTER)
      for (const p of pathIntersections(ray, g.faces[f], 1e-6)) {
        if (dist(p, o.from) < 1 || dist(p, raw) > tol) continue;
        const label = `líc + ${st.label}`;
        out.push({ point: p, kind: 'face', label, priority: o.priority, wallId: g.wallId, face: f });
      }
  return out;
}
