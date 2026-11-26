// Tvar osy / referenční čáry: úsečka nebo kruhový oblouk (základ 23, IFC IfcTrimmedCurve).
// Oblouk se ukládá jako začátek, konec a „bulge“ = tan(středový úhel / 4); kladný = proti směru hodin.
import { arcPoints } from './arc-grid.ts';
import type { Carrier } from './carrier.ts';
import { add, angleOf, dist, leftNormal, mid, mul, norm, rotate, sub, type Vec2, EPS } from './vec.ts';

export type Path =
  | { readonly kind: 'line'; readonly start: Vec2; readonly end: Vec2 }
  | { readonly kind: 'arc'; readonly start: Vec2; readonly end: Vec2; readonly bulge: number };

export type PathEnd = 'start' | 'end';

export interface ArcData {
  readonly center: Vec2;
  readonly radius: number;
  /** Středový úhel se znaménkem (kladný = proti směru hodin). */
  readonly sweep: number;
}

/** Střed, poloměr a středový úhel oblouku. */
export function arcData(p: Extract<Path, { kind: 'arc' }>): ArcData {
  const c = dist(p.start, p.end);
  const b = p.bulge;
  const chordDir = norm(sub(p.end, p.start));
  const center = add(mid(p.start, p.end), mul(leftNormal(chordDir), (c * (1 - b * b)) / (4 * b)));
  return { center, radius: (c * (1 + b * b)) / (4 * Math.abs(b)), sweep: 4 * Math.atan(b) };
}

/** Je to oblouk, nebo je skoro rovný (pak se počítá jako úsečka)? */
const isArc = (p: Path): p is Extract<Path, { kind: 'arc' }> => p.kind === 'arc' && Math.abs(p.bulge) > EPS;

export function pathLength(p: Path): number {
  if (!isArc(p)) return dist(p.start, p.end);
  const a = arcData(p);
  return a.radius * Math.abs(a.sweep);
}

/** Jednotkový směr pohybu po křivce v jejím začátku nebo konci. */
export function tangentAt(p: Path, at: PathEnd): Vec2 {
  if (!isArc(p)) return norm(sub(p.end, p.start));
  const a = arcData(p);
  const point = at === 'start' ? p.start : p.end;
  const radial = norm(sub(point, a.center));
  const left = leftNormal(radial);
  return a.sweep > 0 ? left : mul(left, -1);
}

/** Bod na křivce podle parametru 0..1. */
export function pointAt(p: Path, t: number): Vec2 {
  if (!isArc(p)) return add(p.start, mul(sub(p.end, p.start), t));
  const a = arcData(p);
  return rotate(p.start, a.center, a.sweep * t);
}

export function carrierOf(p: Path): Carrier {
  if (!isArc(p)) return { kind: 'line', p: p.start, d: norm(sub(p.end, p.start)) };
  const a = arcData(p);
  return { kind: 'circle', c: a.center, r: a.radius };
}

/**
 * Rovnoběžná (soustředná) křivka posunutá o `o` mm doleva od směru kreslení.
 * U oblouku proti směru hodin je levá strana ke středu, poloměr se zmenší.
 */
export function offsetPath(p: Path, o: number): Path {
  if (!isArc(p)) {
    const n = mul(leftNormal(norm(sub(p.end, p.start))), o);
    return { kind: 'line', start: add(p.start, n), end: add(p.end, n) };
  }
  const a = arcData(p);
  const r = a.sweep > 0 ? a.radius - o : a.radius + o;
  const k = r / a.radius;
  const scale = (q: Vec2) => add(a.center, mul(sub(q, a.center), k));
  return { kind: 'arc', start: scale(p.start), end: scale(p.end), bulge: p.bulge };
}

/** Bulge oblouku se středem `c` z bodu `s` do bodu `e` se směrem podle znaménka `dirSign`. */
function bulgeFor(c: Vec2, s: Vec2, e: Vec2, dirSign: number): number {
  let sweep = angleOf(sub(e, c)) - angleOf(sub(s, c));
  if (dirSign > 0 && sweep <= 0) sweep += 2 * Math.PI;
  if (dirSign < 0 && sweep >= 0) sweep -= 2 * Math.PI;
  return Math.tan(sweep / 4);
}

/**
 * Přesune jeden konec. U oblouku se zachová kružnice, pokud bod na ní leží
 * (posun po nosné křivce), jinak se zachová bulge (tvar se jen natáhne).
 */
export function withEnd(p: Path, at: PathEnd, point: Vec2): Path {
  const start = at === 'start' ? point : p.start;
  const end = at === 'end' ? point : p.end;
  if (p.kind === 'line') return { kind: 'line', start, end };
  if (Math.abs(p.bulge) <= EPS) return { kind: 'arc', start, end, bulge: p.bulge };
  const a = arcData(p);
  if (Math.abs(dist(point, a.center) - a.radius) > 1e-6 * Math.max(1, a.radius)) {
    return { kind: 'arc', start, end, bulge: p.bulge };
  }
  return { kind: 'arc', start, end, bulge: bulgeFor(a.center, start, end, Math.sign(a.sweep)) };
}

export const endPoint = (p: Path, at: PathEnd): Vec2 => (at === 'start' ? p.start : p.end);

/** Obrácený směr. */
export function reversePath(p: Path): Path {
  return p.kind === 'line'
    ? { kind: 'line', start: p.end, end: p.start }
    : { kind: 'arc', start: p.end, end: p.start, bulge: -p.bulge };
}

/** Posunutí o vektor. */
export function translatePath(p: Path, v: Vec2): Path {
  return p.kind === 'line'
    ? { kind: 'line', start: add(p.start, v), end: add(p.end, v) }
    : { kind: 'arc', start: add(p.start, v), end: add(p.end, v), bulge: p.bulge };
}

/** Otočení kolem bodu (radiány, kladné = proti směru hodin). */
export function rotatePath(p: Path, center: Vec2, angle: number): Path {
  const start = rotate(p.start, center, angle);
  const end = rotate(p.end, center, angle);
  return p.kind === 'line' ? { kind: 'line', start, end } : { kind: 'arc', start, end, bulge: p.bulge };
}

/** Stejnoměrná změna velikosti kolem bodu (k > 0); oblouk si drží vypouklost (bulge je beze změny). */
export function scalePath(p: Path, origin: Vec2, k: number): Path {
  const at = (q: Vec2) => add(origin, mul(sub(q, origin), k));
  return p.kind === 'line'
    ? { kind: 'line', start: at(p.start), end: at(p.end) }
    : { kind: 'arc', start: at(p.start), end: at(p.end), bulge: p.bulge };
}

/** Rozloží křivku na body (oblouk po společné mřížce úhlů, chyba do ARC_TOLERANCE). */
export function tessellate(p: Path): Vec2[] {
  if (!isArc(p)) return [p.start, p.end];
  const a = arcData(p);
  const pts = arcPoints(a.center, a.radius, angleOf(sub(p.start, a.center)), a.sweep);
  pts[0] = p.start;
  pts[pts.length - 1] = p.end;
  return pts;
}
