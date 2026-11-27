// Kříž v otvoru v desce (rozhodnutí prvky stavby 15, české zvyklosti): konvexní obrys = úhlopříčky jako
// dosud; pravoúhlý obrys (hrany jen vodorovné a svislé, např. L) se rozloží na obdélníky a kříž je v každém;
// obecný nekonvexní = úhlopříčky obálky oříznuté na vnitřek obrysu. Žádná čára nesmí vést mimo otvor.
import { cross, sub, type Vec2 } from '../geometry/index.ts';
import { pointInPolygon } from '../selection/pick.ts';

type Seg = [Vec2, Vec2];
const EPS = 1e-6;

const edges = (p: readonly Vec2[]): Seg[] => p.map((a, i) => [a, p[(i + 1) % p.length] as Vec2]);

export const isOrthogonal = (p: readonly Vec2[]): boolean =>
  edges(p).every(([a, b]) => Math.abs(a.x - b.x) < EPS || Math.abs(a.y - b.y) < EPS);

export function isConvex(p: readonly Vec2[]): boolean {
  let sign = 0;
  for (let i = 0; i < p.length; i++) {
    const a = p[i] as Vec2;
    const b = p[(i + 1) % p.length] as Vec2;
    const c = p[(i + 2) % p.length] as Vec2;
    const z = cross(sub(b, a), sub(c, b));
    if (Math.abs(z) < EPS) continue;
    if (sign && Math.sign(z) !== sign) return false;
    sign = Math.sign(z);
  }
  return true;
}

/** Původní kříž: bod 0 a 1 s protějšími body (u obdélníku protilehlé rohy). */
function convexDiagonals(pts: readonly Vec2[]): Seg[] {
  const half = Math.floor(pts.length / 2);
  return [0, 1].map((i) => [pts[i] as Vec2, pts[(i + half) % pts.length] as Vec2]);
}

interface Rect {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

/** Pravoúhlý obrys → obdélníky: pruhy mezi souřadnicemi y, souvislé úseky v x, stejné úseky nad sebou spojené. */
export function orthoRects(pts: readonly Vec2[]): Rect[] {
  const xs = [...new Set(pts.map((p) => p.x))].sort((a, b) => a - b);
  const ys = [...new Set(pts.map((p) => p.y))].sort((a, b) => a - b);
  const done: Rect[] = [];
  let open: Rect[] = [];
  for (let j = 0; j + 1 < ys.length; j++) {
    const [y0, y1] = [ys[j] as number, ys[j + 1] as number];
    const runs: Rect[] = [];
    for (let i = 0; i + 1 < xs.length; i++) {
      const [x0, x1] = [xs[i] as number, xs[i + 1] as number];
      if (!pointInPolygon({ x: (x0 + x1) / 2, y: (y0 + y1) / 2 }, pts)) continue;
      const last = runs[runs.length - 1];
      if (last && Math.abs(last.x1 - x0) < EPS) last.x1 = x1;
      else runs.push({ x0, x1, y0, y1 });
    }
    const next: Rect[] = [];
    for (const r of runs) {
      const k = open.findIndex((o) => Math.abs(o.x0 - r.x0) < EPS && Math.abs(o.x1 - r.x1) < EPS);
      if (k >= 0) next.push({ ...(open.splice(k, 1)[0] as Rect), y1 });
      else next.push(r);
    }
    done.push(...open);
    open = next;
  }
  return [...done, ...open];
}

/** Části úsečky a–b uvnitř mnohoúhelníku. */
export function clipToPolygon(a: Vec2, b: Vec2, pts: readonly Vec2[]): Seg[] {
  const d = sub(b, a);
  const ts = [0, 1];
  for (const [p, q] of edges(pts)) {
    const e = sub(q, p);
    const den = cross(d, e);
    if (Math.abs(den) < EPS) continue;
    const t = cross(sub(p, a), e) / den;
    const u = cross(sub(p, a), d) / den;
    if (t > 0 && t < 1 && u >= -EPS && u <= 1 + EPS) ts.push(t);
  }
  ts.sort((x, y) => x - y);
  const at = (t: number) => ({ x: a.x + d.x * t, y: a.y + d.y * t });
  const out: Seg[] = [];
  for (let i = 0; i + 1 < ts.length; i++) {
    const [t0, t1] = [ts[i] as number, ts[i + 1] as number];
    if (t1 - t0 > EPS && pointInPolygon(at((t0 + t1) / 2), pts)) out.push([at(t0), at(t1)]);
  }
  return out;
}

/** Čáry kříže otvoru (úsečky v mm). */
export function slabOpeningCross(pts: readonly Vec2[]): Seg[] {
  if (pts.length < 3) return [];
  if (isConvex(pts)) return convexDiagonals(pts);
  if (isOrthogonal(pts))
    return orthoRects(pts).flatMap((r): Seg[] => [
      [
        { x: r.x0, y: r.y0 },
        { x: r.x1, y: r.y1 },
      ],
      [
        { x: r.x1, y: r.y0 },
        { x: r.x0, y: r.y1 },
      ],
    ]);
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  return [
    ...clipToPolygon({ x: x0, y: y0 }, { x: x1, y: y1 }, pts),
    ...clipToPolygon({ x: x1, y: y0 }, { x: x0, y: y1 }, pts),
  ];
}
