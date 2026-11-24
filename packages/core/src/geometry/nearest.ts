// Nejbližší bod na křivce a průsečíky dvou křivek (přichytávání a výběr, základy 20, 23).
// Počítá s úsečkou i obloukem; výsledky leží jen na křivce samotné, ne na jejím prodloužení.
import { intersect } from './carrier.ts';
import { carrierOf, pathLength, pointAt, type Path } from './path.ts';
import { paramOf } from './split.ts';
import { dist, type Vec2 } from './vec.ts';

export interface PathHit {
  readonly point: Vec2;
  /** Parametr 0..1 podél křivky. */
  readonly t: number;
  readonly distance: number;
}

const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

/** Nejbližší bod křivky k bodu `q` (konec, pokud průmět padne mimo křivku). */
export function nearestOnPath(p: Path, q: Vec2): PathHit {
  let t = paramOf(p, q);
  if (!Number.isFinite(t)) t = 0;
  if (p.kind === 'arc' && (t < 0 || t > 1)) {
    t = dist(q, p.start) <= dist(q, p.end) ? 0 : 1;
  }
  const tc = clamp01(t);
  const point = pointAt(p, tc);
  return { point, t: tc, distance: dist(point, q) };
}

/** Leží bod (který je na nosné křivce) uvnitř křivky? Tolerance v mm. */
export function onPath(p: Path, q: Vec2, tol = 1e-6): boolean {
  const t = paramOf(p, q);
  const l = Math.max(pathLength(p), 1e-9);
  return t >= -tol / l && t <= 1 + tol / l;
}

/** Průsečíky dvou křivek (jen v jejich rozsahu). */
export function pathIntersections(a: Path, b: Path, tol = 1e-6): Vec2[] {
  return intersect(carrierOf(a), carrierOf(b)).filter((q) => onPath(a, q, tol) && onPath(b, q, tol));
}
