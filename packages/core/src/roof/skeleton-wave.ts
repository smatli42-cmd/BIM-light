// Části vlny kostry (skeleton.ts): hrany s rychlostí a časem startu, vrcholy vlny a jejich rychlost.
// Hrana polovalby stojí jako štít až do výšky zlomu `start`, pak se posouvá rychlostí podle sklonu valby.
import { add, cross, dot, mul, norm, sub, type Vec2 } from '../geometry/index.ts';

export interface Edge {
  readonly d: Vec2;
  readonly n: Vec2;
  readonly c: number;
  /** Vodorovný posun na 1 mm výšky po startu (1 / tg sklonu; štít 0). */
  readonly v: number;
  /** Výška (čas), od které se hrana posouvá; do ní stojí (polovalba: výška zlomu). */
  readonly start: number;
}

export interface Vx {
  readonly p: Vec2;
  readonly t0: number;
  readonly w: Vec2;
  readonly ein: number;
  readonly eout: number;
  readonly reflex: boolean;
  readonly degenerate: boolean;
}

export const pos = (v: Vx, t: number): Vec2 => add(v.p, mul(v.w, t - v.t0));

/** Rychlost hrany v čase t (před startem stojí). */
export const speedAt = (e: Edge, t: number): number => (t >= e.start - 1e-9 ? e.v : 0);

/** Poloha přímky hrany v čase t: n · x = c + posun. */
export const lineAt = (e: Edge, t: number): number => e.c + e.v * Math.max(0, t - e.start);

export function makeEdges(
  pts: readonly Vec2[],
  speeds: readonly number[],
  starts: readonly number[],
): Edge[] {
  return pts.map((p, i) => {
    const q = pts[(i + 1) % pts.length] as Vec2;
    const d = norm(sub(q, p));
    const n = { x: -d.y, y: d.x };
    return { d, n, c: dot(n, p), v: speeds[i] ?? 0, start: starts[i] ?? 0 };
  });
}

/** Vrchol vlny mezi hranami ein → eout v bodě p v čase t (rychlost podle aktuálních rychlostí hran). */
export function vertex(E: readonly Edge[], ein: number, eout: number, p: Vec2, t: number): Vx {
  const a = E[ein] as Edge;
  const b = E[eout] as Edge;
  const [va, vb] = [speedAt(a, t), speedAt(b, t)];
  const det = cross(a.n, b.n);
  const reflex = cross(a.d, b.d) < -1e-9;
  if (Math.abs(det) > 1e-9) {
    const w = { x: (va * b.n.y - vb * a.n.y) / det, y: (a.n.x * vb - b.n.x * va) / det };
    return { p, t0: t, w, ein, eout, reflex, degenerate: false };
  }
  // Rovnoběžné hrany: stejný směr = vrchol jde s hranou, protisměr = hřeben (vrchol stojí).
  const same = dot(a.n, b.n) > 0;
  return { p, t0: t, w: same ? mul(a.n, va) : { x: 0, y: 0 }, ein, eout, reflex, degenerate: !same };
}
