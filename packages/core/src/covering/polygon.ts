// Mnohoúhelníky v rovině plochy (u, v) a 2D množinové operace (rozdíl, průnik) přes knihovnu
// polygon-clipping (bez DOM, základ 9). Plocha = vnější obrys + díry.
import pc, { type MultiPolygon, type Ring } from 'polygon-clipping';
import type { Vec2 } from '../geometry/index.ts';
import { signedArea } from '../slab/geometry.ts';

export interface PlanePolygon {
  /** Vnější obrys proti směru hodin (u, v v mm). */
  readonly outer: readonly Vec2[];
  /** Díry po směru hodin. */
  readonly holes: readonly (readonly Vec2[])[];
}

export const rect = (u0: number, v0: number, u1: number, v1: number): Vec2[] => [
  { x: u0, y: v0 },
  { x: u1, y: v0 },
  { x: u1, y: v1 },
  { x: u0, y: v1 },
];

const ring = (pts: readonly Vec2[]): Ring => pts.map((p) => [p.x, p.y] as [number, number]);
const toMulti = (polys: readonly PlanePolygon[]): MultiPolygon =>
  polys.map((p) => [ring(p.outer), ...p.holes.map(ring)]);

/** Vypustí uzavírací bod (polygon-clipping opakuje první bod na konci). */
const pts = (r: Ring): Vec2[] => r.slice(0, -1).map(([x, y]) => ({ x, y }));

function fromMulti(m: MultiPolygon): PlanePolygon[] {
  return m
    .map(([outer, ...holes]) => ({ outer: pts(outer ?? []), holes: holes.map(pts) }))
    .filter((p) => p.outer.length >= 3 && Math.abs(signedArea(p.outer)) > 1);
}

export const planePolygon = (outer: readonly Vec2[]): PlanePolygon[] =>
  fromMulti(pc.union(toMulti([{ outer, holes: [] }])));

/** A minus otvory. */
export function difference(a: readonly PlanePolygon[], cut: readonly (readonly Vec2[])[]): PlanePolygon[] {
  if (!cut.length || !a.length) return [...a];
  return fromMulti(pc.difference(toMulti(a), ...cut.map((c) => [[ring(c)]] as MultiPolygon)));
}

/** Průnik s obdélníkem (výšková zóna). */
export function clipRect(a: readonly PlanePolygon[], r: readonly Vec2[]): PlanePolygon[] {
  if (!a.length) return [];
  return fromMulti(pc.intersection(toMulti(a), [[ring(r)]]));
}

/** Plocha (mm²) = obrysy minus díry. */
export const polygonsArea = (polys: readonly PlanePolygon[]): number =>
  polys.reduce(
    (s, p) => s + Math.abs(signedArea(p.outer)) - p.holes.reduce((h, x) => h + Math.abs(signedArea(x)), 0),
    0,
  );

/** Sjednocení mnohoúhelníků (obrys + díry) a dalších obrysů. */
export function union(a: readonly PlanePolygon[], add: readonly (readonly Vec2[])[]): PlanePolygon[] {
  if (!add.length) return [...a];
  return fromMulti(pc.union(toMulti(a), ...add.map((c) => [[ring(c)]] as MultiPolygon)));
}
