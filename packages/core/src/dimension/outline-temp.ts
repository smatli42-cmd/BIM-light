// Dočasné kóty obrysu desky a otvoru v desce (katalog kreslení 3; Revit u náčrtu a otvoru): ve směru X a Y
// na obě strany od krajní hrany (nebo krajního rohu) obrysu k nejbližšímu líci stěny, hraně desky nebo
// jiného otvoru. Stejně i rozpracovaný obrys při kreslení (i jediný bod). Rovnost se stěnou: líc stěny má
// přednost před hranou desky, která na něm leží [R].
import { carrierOf, dot, intersect, norm, onPath, sub, type Path, type Vec2 } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import type { Model } from '../model/types.ts';
import { outlineEdges, snapOutlines, type SnapOutline } from '../snap/outline-snap.ts';
import { snapGeometry } from '../snap/resolve.ts';
import type { WallGeometry } from '../wall/geometry.ts';
import type { DimRef, OutlineRef } from './types.ts';

/** Strana kóty: směr od obrysu (x+ = doprava, y+ = nahoru v souřadnicích modelu). */
export type OutlineSide = 'x-' | 'x+' | 'y-' | 'y+';
export const OUTLINE_SIDES: readonly OutlineSide[] = ['x-', 'x+', 'y-', 'y+'];

export interface OutlineTempDimension {
  readonly kind: 'outline';
  readonly side: OutlineSide;
  /** Hrana (nebo roh) obrysu, od které se měří; null u rozpracovaného obrysu (ještě není v modelu). */
  readonly own: OutlineRef | null;
  readonly other: DimRef;
  readonly from: Vec2;
  readonly to: Vec2;
  /** Jednotkový směr od obrysu k druhému prvku. */
  readonly dir: Vec2;
  readonly value: number;
  /** Měří se mezi rovnoběžnými hranami (jen pak jde udělat trvalou kótu). */
  readonly parallel: boolean;
}

/** Vlastník obrysu (deska nebo otvor v desce), aby se neměřilo k sobě samému. */
export interface OutlineSelf {
  readonly outline: 'slab' | 'slabOpening';
  readonly ownerId: Id;
}

const DIRS: Record<OutlineSide, Vec2> = {
  'x-': { x: -1, y: 0 },
  'x+': { x: 1, y: 0 },
  'y-': { x: 0, y: -1 },
  'y+': { x: 0, y: 1 },
};
const TIE = 0.5;

interface Start {
  readonly from: Vec2;
  readonly own: OutlineRef | null;
  /** Krajní hrana je kolmá ke směru (měří se mezi rovnoběžkami). */
  readonly edge: boolean;
}

/** Krajní hrana (kolmá ke směru) nebo krajní roh obrysu ve směru `d`. */
function extreme(points: readonly Vec2[], d: Vec2, self: OutlineSelf | null): Start {
  const top = Math.max(...points.map((p) => dot(p, d)));
  const n = points.length;
  const ref = (k: { edge?: number; vertex?: number }) => (self ? { ...self, ...k } : null);
  for (let i = 0; i < n && n > 1; i++) {
    const a = points[i] as Vec2;
    const b = points[(i + 1) % n] as Vec2;
    if (top - dot(a, d) < TIE && top - dot(b, d) < TIE && (n > 2 || i === 0))
      return { from: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, own: ref({ edge: i }), edge: true };
  }
  const i = points.findIndex((p) => top - dot(p, d) < TIE);
  return { from: points[i] as Vec2, own: ref({ vertex: i }), edge: false };
}

interface Hit {
  readonly s: number;
  readonly point: Vec2;
  readonly ref: DimRef;
  readonly parallel: boolean;
  readonly wall: boolean;
}

function hitPath(o: Vec2, d: Vec2, path: Path, ref: DimRef, wall: boolean): Hit | null {
  let best: Hit | null = null;
  for (const q of intersect({ kind: 'line', p: o, d }, carrierOf(path))) {
    const s = dot(sub(q, o), d);
    if (s <= TIE || !onPath(path, q, 1)) continue;
    const parallel = path.kind === 'line' && Math.abs(dot(norm(sub(path.end, path.start)), d)) < 1e-4;
    if (!best || s < best.s) best = { s, point: q, ref, parallel, wall };
  }
  return best;
}

function better(h: Hit | null, best: Hit | null): boolean {
  if (!h) return false;
  if (!best) return true;
  if (Math.abs(h.s - best.s) < 1) return h.wall && !best.wall;
  return h.s < best.s;
}

function nearest(o: Vec2, d: Vec2, geoms: readonly WallGeometry[], outlines: readonly SnapOutline[]) {
  let best: Hit | null = null;
  for (const g of geoms)
    for (const face of ['ref', 'opp'] as const) {
      const h = hitPath(o, d, g.faces[face], { wallId: g.wallId, face }, true);
      if (better(h, best)) best = h;
    }
  for (const ol of outlines)
    outlineEdges(ol.points).forEach((e, edge) => {
      const h = hitPath(o, d, e, { outline: ol.outline, ownerId: ol.ownerId, edge }, false);
      if (better(h, best)) best = h;
    });
  return best;
}

/**
 * Dočasné kóty obrysu `points` na podlaží: na každou ze 4 stran nejbližší prvek (líc stěny, hrana desky
 * nebo otvoru v desce). `self` = vlastník obrysu (vynechá se); bez něj jde o rozpracovaný obrys.
 */
export function outlineTempDimensions(
  model: Model,
  storeyId: Id,
  points: readonly Vec2[],
  self: OutlineSelf | null = null,
): OutlineTempDimension[] {
  if (!points.length) return [];
  const geoms = snapGeometry(model, storeyId);
  const outlines = snapOutlines(model, storeyId, self ? new Set([self.ownerId]) : undefined);
  const out: OutlineTempDimension[] = [];
  for (const side of OUTLINE_SIDES) {
    const d = DIRS[side];
    const st = extreme(points, d, self);
    const h = nearest(st.from, d, geoms, outlines);
    if (!h) continue;
    const parallel = st.edge && h.parallel;
    out.push({
      kind: 'outline',
      side,
      own: st.own,
      other: h.ref,
      from: st.from,
      to: h.point,
      dir: d,
      value: h.s,
      parallel,
    });
  }
  return out;
}

/** Obrys a podlaží desky nebo otvoru v desce (null = prvek neexistuje). */
export function outlineElement(
  model: Model,
  id: Id,
): (OutlineSelf & { points: readonly Vec2[]; storeyId: Id }) | null {
  const o = model.slabOpenings[id];
  if (o) return { outline: 'slabOpening', ownerId: id, points: o.outline, storeyId: o.storeyId };
  const el = model.elements[id];
  if (el?.category === 'slab')
    return { outline: 'slab', ownerId: id, points: el.outline, storeyId: el.storeyId };
  return null;
}

/** Dočasné kóty vybrané desky nebo otvoru v desce (klik na číslo = `outline.setDistance`). */
export function elementOutlineTempDimensions(model: Model, id: Id): OutlineTempDimension[] {
  const e = outlineElement(model, id);
  return e ? outlineTempDimensions(model, e.storeyId, e.points, e) : [];
}

/** Vektor posunu obrysu, aby kóta na straně `t.side` měla hodnotu `value` (druhý prvek stojí, základ 25). */
export const outlineShift = (t: OutlineTempDimension, value: number): Vec2 => ({
  x: t.dir.x * (t.value - value),
  y: t.dir.y * (t.value - value),
});
