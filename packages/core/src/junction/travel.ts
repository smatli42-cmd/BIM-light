// „Jízda“ vrstvy přes uzel: v jakém pořadí potká vrstvy druhé stěny, kde je jejich bližší hranice,
// a jestli vrstva druhé stěny v dané buňce skutečně je (po svém vlastním ořezu).
import { add, angleOf, arcPoints, dot, mul, sub, type Vec2 } from '../geometry/index.ts';
import { boundary, radiusAt, type Arm, type Frame, type FrameLayer } from './frame.ts';
import { clipAll, MIN_AREA, signedArea, type Cut } from './half-plane.ts';

export interface Crossing {
  readonly layer: FrameLayer;
  /** Offset hranice, na kterou vrstva narazí jako první. */
  readonly near: number;
}

export interface CrossOrder {
  readonly order: readonly Crossing[];
  /** Offset vzdáleného líce druhé stěny (kam dojede nezastavená vrstva). */
  readonly far: number;
}

/** Vrstvy stěny `other` v pořadí, jak je potká vrstva jedoucí z ramene `a` přes uzel (směr −out). */
export function crossOrder(a: Arm, other: Frame): CrossOrder {
  const up = dot(mul(a.out, -1), other.normal) > 0;
  const order = [...other.layers]
    .sort((x, y) => (up ? x.lo - y.lo : y.hi - x.hi))
    .map((layer) => ({ layer, near: up ? layer.lo : layer.hi }));
  return { order, far: up ? other.hi : other.lo };
}

/** Polorovina „zastav na offsetu `o` druhé stěny“ (zůstává strana k tělu ramene). */
export const stopAt = (a: Arm, other: Frame, o: number): Cut => boundary(other, o, a.out);

/** Pás vrstvy ramene kolem uzlu (u oblouku výseč mezikruží, nejvýš ±60°). */
function strip(a: Frame, lo: number, hi: number, reach: number): Vec2[] {
  if (!a.arc) {
    const at = (u: number, v: number) => add(add(a.origin, mul(a.tangent, u)), mul(a.normal, v));
    return [at(-reach, lo), at(reach, lo), at(reach, hi), at(-reach, hi)];
  }
  const [r1, r2] = [radiusAt(a.arc, lo), radiusAt(a.arc, hi)];
  const ang = angleOf(sub(a.origin, a.arc.c));
  const span = Math.min(Math.PI / 3, reach / Math.max(r1, r2, 1));
  const poly = [
    ...arcPoints(a.arc.c, r1, ang - span, 2 * span),
    ...arcPoints(a.arc.c, r2, ang + span, -2 * span),
  ];
  return signedArea(poly) >= 0 ? poly : poly.reverse();
}

/** U oblouku výseč kolem uzlu (±60°), aby se nepočítala vrstva na protější straně kružnice. */
function wedge(f: Frame, reach: number): Cut[] {
  const arc = f.arc;
  if (!arc) return [];
  const ang = angleOf(sub(f.origin, arc.c));
  const span = Math.min(Math.PI / 3, reach / Math.max(radiusAt(arc, f.lo), radiusAt(arc, f.hi), 1));
  const ray = (t: number, dir: 1 | -1): Cut => {
    const d = { x: Math.cos(t), y: Math.sin(t) };
    return { p: arc.c, n: { x: -d.y * dir, y: d.x * dir } };
  };
  return [ray(ang - span, 1), ray(ang + span, -1)];
}

/** Buňka = průnik pásu vrstvy `x` ramene `a` a pásu vrstvy `y` stěny `other` (kolem uzlu). */
export function cell(a: Arm, x: FrameLayer, other: Frame, y: FrameLayer, reach: number): Vec2[][] {
  const n = other.normal;
  const cuts = [boundary(other, y.lo, n), boundary(other, y.hi, mul(n, -1)), ...wedge(other, reach)];
  return clipAll(strip(a, x.lo, x.hi, reach), cuts);
}

/** Leží vrstva s ořezem `cuts` (aspoň kouskem) v buňce? */
export const occupies = (cellPolys: readonly (readonly Vec2[])[], cuts: readonly Cut[]): boolean =>
  cellPolys.some((c) => clipAll(c, cuts).some((p) => p.length >= 3 && Math.abs(signedArea(p)) > MIN_AREA));
