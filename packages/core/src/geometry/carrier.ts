// Nosná křivka = nekonečná přímka nebo celá kružnice, na které leží úsečka / oblouk.
// Slouží pro průsečíky (rohy, T napojení, kóty) u přímých i obloukových stěn (základ 23).
import { add, cross, dist, dot, mul, sub, type Vec2, EPS } from './vec.ts';

export type Carrier =
  | { readonly kind: 'line'; readonly p: Vec2; readonly d: Vec2 }
  | { readonly kind: 'circle'; readonly c: Vec2; readonly r: number };

function lineLine(a: Vec2, da: Vec2, b: Vec2, db: Vec2): Vec2[] {
  const den = cross(da, db);
  if (Math.abs(den) < 1e-6) return [];
  const t = cross(sub(b, a), db) / den;
  return [add(a, mul(da, t))];
}

function lineCircle(p: Vec2, d: Vec2, c: Vec2, r: number): Vec2[] {
  const f = sub(p, c);
  const a = dot(d, d);
  const b = 2 * dot(f, d);
  const k = dot(f, f) - r * r;
  const disc = b * b - 4 * a * k;
  if (disc < -EPS) return [];
  const s = Math.sqrt(Math.max(0, disc));
  const t1 = (-b - s) / (2 * a);
  const t2 = (-b + s) / (2 * a);
  return s < EPS ? [add(p, mul(d, t1))] : [add(p, mul(d, t1)), add(p, mul(d, t2))];
}

function circleCircle(c1: Vec2, r1: number, c2: Vec2, r2: number): Vec2[] {
  const d = dist(c1, c2);
  if (d < EPS || d > r1 + r2 + EPS || d < Math.abs(r1 - r2) - EPS) return [];
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
  const u = mul(sub(c2, c1), 1 / d);
  const m = add(c1, mul(u, a));
  const n = { x: -u.y, y: u.x };
  return h < EPS ? [m] : [add(m, mul(n, h)), sub(m, mul(n, h))];
}

/** Všechny průsečíky dvou nosných křivek. */
export function intersect(a: Carrier, b: Carrier): Vec2[] {
  if (a.kind === 'line' && b.kind === 'line') return lineLine(a.p, a.d, b.p, b.d);
  if (a.kind === 'line' && b.kind === 'circle') return lineCircle(a.p, a.d, b.c, b.r);
  if (a.kind === 'circle' && b.kind === 'line') return lineCircle(b.p, b.d, a.c, a.r);
  if (a.kind === 'circle' && b.kind === 'circle') return circleCircle(a.c, a.r, b.c, b.r);
  return [];
}

/** Průsečík nejbližší k danému bodu, nebo null. */
export function intersectNearest(a: Carrier, b: Carrier, near: Vec2, maxDist = Infinity): Vec2 | null {
  let best: Vec2 | null = null;
  for (const p of intersect(a, b)) {
    if (dist(p, near) <= maxDist && (!best || dist(p, near) < dist(best, near))) best = p;
  }
  return best;
}

/** Vzdálenost bodu od nosné křivky. */
export function distanceToCarrier(p: Vec2, c: Carrier): number {
  if (c.kind === 'line') return Math.abs(cross(c.d, sub(p, c.p)));
  return Math.abs(dist(p, c.c) - c.r);
}

/** Kolmý průmět bodu na nosnou křivku. */
export function projectOnCarrier(p: Vec2, c: Carrier): Vec2 {
  if (c.kind === 'line') return add(c.p, mul(c.d, dot(sub(p, c.p), c.d)));
  const v = sub(p, c.c);
  const l = Math.hypot(v.x, v.y);
  return l < EPS ? add(c.c, { x: c.r, y: 0 }) : add(c.c, mul(v, c.r / l));
}
