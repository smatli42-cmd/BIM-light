// Roviny kostry jako mnohoúhelníky: hranice roviny hrany i = hrana obrysu + úsečky kostry, které ji ohraničují
// (skeleton.ts). Obchází se proti směru hodin od konce hrany zpět k jejímu začátku, na rozcestí s nejostřejší
// odbočkou doleva (rovina leží vlevo od své hrany).
import { dist, type Vec2 } from '../geometry/index.ts';
import type { Skeleton, Vec3 } from './skeleton.ts';

const TOL = 0.5;
const near = (a: Vec3, b: Vec3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) < TOL;

function turn(from: Vec3, at: Vec3, to: Vec3): number {
  const ax = at.x - from.x;
  const ay = at.y - from.y;
  const bx = to.x - at.x;
  const by = to.y - at.y;
  return Math.atan2(ax * by - ay * bx, ax * bx + ay * by);
}

/** Obrys roviny hrany i (3D, z = výška nad referenční čárou); null = kostra nedala uzavřenou smyčku. */
export function faceLoop(sk: Skeleton, pts: readonly Vec2[], i: number): Vec3[] | null {
  const p0 = pts[i] as Vec2;
  const p1 = pts[(i + 1) % pts.length] as Vec2;
  const start: Vec3 = { ...p0, z: 0 };
  const segs = (sk.faceSegs[i] ?? []).filter(([a, b]) => !near(a, b));
  const used = new Set<number>();
  const loop: Vec3[] = [start, { ...p1, z: 0 }];
  for (let guard = 0; guard <= segs.length; guard++) {
    const cur = loop[loop.length - 1] as Vec3;
    const prev = loop[loop.length - 2] as Vec3;
    if (loop.length > 2 && near(cur, start)) return loop.slice(0, -1);
    let best = -1;
    let bestTurn = -Infinity;
    let bestTo: Vec3 | null = null;
    segs.forEach(([a, b], k) => {
      if (used.has(k)) return;
      const to = near(a, cur) ? b : near(b, cur) ? a : null;
      if (!to) return;
      const tr = turn(prev, cur, to);
      if (tr > bestTurn) [best, bestTurn, bestTo] = [k, tr, to];
    });
    if (best < 0 || !bestTo) return null;
    used.add(best);
    loop.push(bestTo);
  }
  return null;
}

/** Plocha půdorysu smyčky (kladná proti směru hodin). */
export function loopArea(loop: readonly Vec3[]): number {
  let s = 0;
  loop.forEach((p, k) => {
    const q = loop[(k + 1) % loop.length] as Vec3;
    s += p.x * q.y - q.x * p.y;
  });
  return s / 2;
}

/** Odstraní body, které leží na přímce sousedů (v půdorysu i výšce); hrana obrysu (body 0, 1) zůstane. */
export function simplifyLoop(loop: readonly Vec3[]): Vec3[] {
  const out = loop.filter((p, k) => {
    if (k < 2) return true;
    const a = loop[(k + loop.length - 1) % loop.length] as Vec3;
    const b = loop[(k + 1) % loop.length] as Vec3;
    const ab = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
    const ap = Math.hypot(p.x - a.x, p.y - a.y, p.z - a.z);
    const pb = Math.hypot(b.x - p.x, b.y - p.y, b.z - p.z);
    return ap + pb - ab > 0.01 && dist(a, p) + dist(p, b) > 0;
  });
  return out.length >= 3 ? out : [...loop];
}
