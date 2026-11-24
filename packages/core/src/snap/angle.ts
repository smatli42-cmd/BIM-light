// Úhlové kroky a pomocné čáry (katalog kreslení 2: kroky 0° / 90° vůči předchozí stěně + 45°,
// Shift drží jen 0° / 90°; délka myší se zaokrouhluje na 10 mm).
import { add, dist, dot, len, mul, sub, type Vec2 } from '../geometry/index.ts';
import { ANGLE_SNAP_DEG, ROUND_STEP, type SnapResult } from './types.ts';

const RAD = Math.PI / 180;

export const roundTo = (v: number, step = ROUND_STEP): number => Math.round(v / step) * step;

/** Rozdíl dvou úhlů v radiánech (0..π). */
export function angleDiff(a: number, b: number): number {
  const d = (((a - b + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  return Math.abs(d - Math.PI);
}

interface Step {
  readonly angle: number;
  readonly diff: number;
  readonly label: string;
}

function stepLabel(k: number, step: number, hasPrev: boolean): string {
  const a = k * step;
  if (a === 0) return hasPrev ? 'rovně' : 'vodorovně';
  if (a === 180) return 'zpět';
  if (a % 90 === 0) return hasPrev ? 'pravý úhel' : 'svisle';
  return '45°';
}

/** Nejbližší úhlový krok k danému směru. */
export function nearestStep(phi: number, prevDir: number | null, orthoOnly: boolean): Step {
  const step = orthoOnly ? 90 : 45;
  const base = prevDir ?? 0;
  let best: Step | null = null;
  for (let k = 0; k < 360 / step; k++) {
    const angle = base + k * step * RAD;
    const diff = angleDiff(phi, angle);
    if (!best || diff < best.diff) best = { angle, diff, label: stepLabel(k, step, prevDir !== null) };
  }
  return best as Step;
}

/** Pomocná čára: bod na paprsku, který leží vodorovně / svisle od některého rohu. */
function guideOnRay(from: Vec2, u: Vec2, near: Vec2, corners: readonly Vec2[], tol: number) {
  let best: { q: Vec2; p: Vec2; d: number } | null = null;
  const tryAt = (l: number, p: Vec2) => {
    if (!(l > 0)) return;
    const q = add(from, mul(u, l));
    const d = dist(q, near);
    if (d <= tol && (!best || d < best.d)) best = { q, p, d };
  };
  for (const p of corners) {
    if (Math.abs(u.x) > 0.05) tryAt((p.x - from.x) / u.x, p);
    if (Math.abs(u.y) > 0.05) tryAt((p.y - from.y) / u.y, p);
  }
  return best as { q: Vec2; p: Vec2; d: number } | null;
}

/** Přichycení směru od předchozího bodu k úhlovému kroku; null = směr je volný. */
export function snapAngle(
  raw: Vec2,
  from: Vec2,
  prevDir: number | null,
  orthoOnly: boolean,
  corners: readonly Vec2[],
  tol: number,
): SnapResult | null {
  const v = sub(raw, from);
  if (len(v) < 1e-6) return null;
  const st = nearestStep(Math.atan2(v.y, v.x), prevDir, orthoOnly);
  if (!orthoOnly && st.diff > ANGLE_SNAP_DEG * RAD) return null;
  const u = { x: Math.cos(st.angle), y: Math.sin(st.angle) };
  const l = Math.max(0, dot(v, u));
  const g = guideOnRay(from, u, add(from, mul(u, l)), corners, tol);
  if (g) return { point: g.q, snap: info('guide', 'pomocná čára'), guides: [[g.p, g.q]] };
  return { point: add(from, mul(u, roundTo(l))), snap: info('angle', st.label), guides: [] };
}

const info = (kind: 'angle' | 'guide', label: string) => ({ kind, label, index: 0, count: 1 });

/** Volný bod: pomocné čáry vodorovně / svisle od rohů, jinak zaokrouhlení na 10 mm. */
export function freePoint(raw: Vec2, from: Vec2 | null, corners: readonly Vec2[], tol: number): SnapResult {
  let gx: Vec2 | null = null;
  let gy: Vec2 | null = null;
  for (const p of corners) {
    if (Math.abs(raw.x - p.x) <= tol && (!gx || Math.abs(raw.x - p.x) < Math.abs(raw.x - gx.x))) gx = p;
    if (Math.abs(raw.y - p.y) <= tol && (!gy || Math.abs(raw.y - p.y) < Math.abs(raw.y - gy.y))) gy = p;
  }
  if (gx || gy) {
    const point = { x: gx ? gx.x : roundTo(raw.x), y: gy ? gy.y : roundTo(raw.y) };
    const guides: [Vec2, Vec2][] = [];
    if (gx) guides.push([gx, point]);
    if (gy) guides.push([gy, point]);
    return { point, snap: info('guide', 'pomocná čára'), guides };
  }
  if (from) {
    const v = sub(raw, from);
    const l = len(v);
    if (l > 1e-6) return { point: add(from, mul(v, roundTo(l) / l)), snap: null, guides: [] };
  }
  return { point: { x: roundTo(raw.x), y: roundTo(raw.y) }, snap: null, guides: [] };
}
