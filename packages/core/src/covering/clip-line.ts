// Ořez přímky mnohoúhelníky plochy (u, v) – spáry spárořezu jako úsečky jen uvnitř plochy (mimo otvory).
// Průsečíky přímky se všemi hranami se seřadí a úsek mezi dvěma sousedními se vezme, když jeho střed
// leží v ploše (obrys a ne v díře). Bez DOM (základ 9).
import type { Vec2 } from '../geometry/index.ts';
import type { PlanePolygon } from './polygon.ts';

export interface Segment {
  readonly a: Vec2;
  readonly b: Vec2;
}

/** Leží bod uvnitř mnohoúhelníku? (paprsková metoda) */
export function insideRing(p: Vec2, ring: readonly Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i] as Vec2;
    const b = ring[j] as Vec2;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** Leží bod v ploše (v některém obrysu a v žádné jeho díře)? */
export const insidePolygons = (p: Vec2, polys: readonly PlanePolygon[]): boolean =>
  polys.some((g) => insideRing(p, g.outer) && !g.holes.some((h) => insideRing(p, h)));

/** Parametry t průsečíků úsečky p0 → p1 s hranami kruhu (0 ≤ t ≤ 1). */
function crossings(p0: Vec2, p1: Vec2, ring: readonly Vec2[], out: number[]) {
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[j] as Vec2;
    const b = ring[i] as Vec2;
    const ex = b.x - a.x;
    const ey = b.y - a.y;
    const den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-12) continue;
    const t = ((a.x - p0.x) * ey - (a.y - p0.y) * ex) / den;
    const s = ((a.x - p0.x) * dy - (a.y - p0.y) * dx) / den;
    if (t >= 0 && t <= 1 && s >= -1e-9 && s <= 1 + 1e-9) out.push(t);
  }
}

/** Části úsečky p0 → p1 uvnitř plochy; úseky kratší než 0,5 mm se vynechají. */
export function clipSegment(polys: readonly PlanePolygon[], p0: Vec2, p1: Vec2): Segment[] {
  const ts = [0, 1];
  for (const g of polys) [g.outer, ...g.holes].forEach((r) => crossings(p0, p1, r, ts));
  ts.sort((a, b) => a - b);
  const len = Math.hypot(p1.x - p0.x, p1.y - p0.y);
  const at = (t: number) => ({ x: p0.x + (p1.x - p0.x) * t, y: p0.y + (p1.y - p0.y) * t });
  const out: Segment[] = [];
  for (let i = 0; i + 1 < ts.length; i++) {
    const t0 = ts[i] as number;
    const t1 = ts[i + 1] as number;
    if ((t1 - t0) * len < 0.5 || !insidePolygons(at((t0 + t1) / 2), polys)) continue;
    const last = out[out.length - 1];
    const a = at(t0);
    // Navazující úseky (průsečík ve vrcholu) spojit do jedné úsečky.
    if (last && Math.hypot(last.b.x - a.x, last.b.y - a.y) < 1e-6)
      out[out.length - 1] = { a: last.a, b: at(t1) };
    else out.push({ a, b: at(t1) });
  }
  return out;
}
