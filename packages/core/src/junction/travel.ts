// „Jízda“ vrstvy přes uzel: v jakém pořadí potká vrstvy druhé stěny, kde je jejich bližší hranice,
// a jestli vrstva druhé stěny v dané buňce skutečně je (po svém vlastním ořezu).
import { add, dot, mul, type Vec2 } from '../geometry/index.ts';
import { boundary, type Arm, type Frame, type FrameLayer } from './frame.ts';
import { clipAll, MIN_AREA, signedArea, type HalfPlane } from './half-plane.ts';

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
export const stopAt = (a: Arm, other: Frame, o: number): HalfPlane => boundary(other, o, a.out);

/** Buňka = průnik pásu vrstvy `x` ramene `a` a pásu vrstvy `y` stěny `other` (kolem uzlu). */
export function cell(a: Arm, x: FrameLayer, other: Frame, y: FrameLayer, reach: number): Vec2[] {
  const at = (u: number, v: number) => add(add(a.origin, mul(a.tangent, u)), mul(a.normal, v));
  const quad = [at(-reach, x.lo), at(reach, x.lo), at(reach, x.hi), at(-reach, x.hi)];
  const n = other.normal;
  return clipAll(quad, [boundary(other, y.lo, n), boundary(other, y.hi, mul(n, -1))]);
}

/** Leží vrstva s ořezem `cuts` (aspoň kouskem) v buňce? */
export const occupies = (cellPoly: readonly Vec2[], cuts: readonly HalfPlane[]): boolean =>
  cellPoly.length >= 3 && Math.abs(signedArea(clipAll(cellPoly, cuts))) > MIN_AREA;
