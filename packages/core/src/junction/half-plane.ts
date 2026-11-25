// Polorovina a ořez mnohoúhelníku přímkou (Sutherland–Hodgman). Jediná „polygonová“ operace, kterou
// napojení vrstev potřebuje: každý kousek vrstvy je průnik pásu a řezů (návrh Z2 ve STAV.md). Řez je
// polorovina, nebo u obloukové stěny vnitřek / vnějšek kružnice (Z5, circle-cut.ts).
import { add, cross, dot, leftNormal, mul, norm, sub, type Vec2 } from '../geometry/index.ts';
import { circleSide, clipCircle, type CircleCut } from './circle-cut.ts';

/** Polorovina { x : (x − p) · n ≥ 0 }; `n` míří do strany, která zůstává. */
export interface HalfPlane {
  readonly p: Vec2;
  readonly n: Vec2;
}

/** Polorovina s hraniční přímkou bodem `p` ve směru `d`, která obsahuje stranu „k“ vektoru `toward`. */
export function halfPlane(p: Vec2, d: Vec2, toward: Vec2): HalfPlane {
  const n = norm(leftNormal(d));
  return { p, n: dot(n, toward) >= 0 ? n : mul(n, -1) };
}

export type { CircleCut } from './circle-cut.ts';

/** Řez: polorovina, nebo strana kružnice. */
export type Cut = HalfPlane | CircleCut;

export const isCircle = (h: Cut): h is CircleCut => 'r' in h;

/** Opačná strana řezu (doplněk). */
export function flip<T extends Cut>(h: T): T {
  return (isCircle(h) ? { ...h, inside: !h.inside } : { p: h.p, n: mul(h.n, -1) }) as T;
}

/** Vzdálenost od hranice řezu se znaménkem; kladná = strana, která zůstává. */
export const side = (h: Cut, x: Vec2): number => (isCircle(h) ? circleSide(h, x) : dot(sub(x, h.p), h.n));

/** Směr hraniční přímky. */
export const lineDir = (h: HalfPlane): Vec2 => ({ x: h.n.y, y: -h.n.x });

/** Ořízne mnohoúhelník řezem; vrací části (řez kružnicí může dát víc částí). */
export function clip(poly: readonly Vec2[], h: Cut): Vec2[][] {
  if (isCircle(h)) return clipCircle(signedArea(poly) >= 0 ? poly : [...poly].reverse(), h);
  return [clipLine(poly, h)];
}

/** Ořez polorovinou (Sutherland–Hodgman); vrací body (může být prázdné). */
function clipLine(poly: readonly Vec2[], h: HalfPlane): Vec2[] {
  const out: Vec2[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i] as Vec2;
    const b = poly[(i + 1) % poly.length] as Vec2;
    const sa = side(h, a);
    const sb = side(h, b);
    if (sa >= 0) out.push(a);
    if (sa >= 0 !== sb >= 0) out.push(add(a, mul(sub(b, a), sa / (sa - sb))));
  }
  return out;
}

/** Má mnohoúhelník skutečnou plochu (ne zbytek po ořezu, např. „plochý“ pruh podél hrany)? */
const solid = (p: readonly Vec2[]) => p.length >= 3 && Math.abs(signedArea(p)) > MIN_AREA;

/**
 * Ořízne mnohoúhelník všemi řezy; vrací části s nenulovou plochou. Zbytky s nulovou plochou se zahodí
 * před dalším řezem – ořez kružnicí by z nich udělal nesmyslný tvar (Z5).
 */
export const clipAll = (poly: readonly Vec2[], hs: readonly Cut[]): Vec2[][] =>
  hs.reduce<Vec2[][]>((ps, h) => ps.filter(solid).flatMap((p) => clip(p, h)), [[...poly]]).filter(solid);

/** Plocha se znaménkem (kladná = proti směru hodin). */
export function signedArea(poly: readonly Vec2[]): number {
  let s = 0;
  for (let i = 0; i < poly.length; i++) s += cross(poly[i] as Vec2, poly[(i + 1) % poly.length] as Vec2);
  return s / 2;
}

/** Plocha pod tuto mez (mm²) je zbytek po ořezu, ne skutečný kousek vrstvy. */
export const MIN_AREA = 1e-3;

/** Průsečík dvou přímek (bod + směr), nebo null u rovnoběžných. */
export function lineX(a: Vec2, da: Vec2, b: Vec2, db: Vec2): Vec2 | null {
  const den = cross(da, db);
  if (Math.abs(den) < 1e-12) return null;
  return add(a, mul(da, cross(sub(b, a), db) / den));
}
