// Kóty k hranám a rohům obrysu desky a otvoru v desce (desky D4). Odkaz je index hrany / rohu obrysu
// (základ 4: kóta se počítá z modelu); roh se kótuje přímkou vedenou rohem rovnoběžně s druhým lícem.
import { add, sub, tangentAt, type Path, type Vec2 } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import type { Model } from '../model/types.ts';
import { putElements, putSlabOpenings, removeDimensions } from '../model/update.ts';
import type { Dimension, DimRef, OutlineRef } from './types.ts';
import { isOutlineRef } from './types.ts';

/** Body obrysu vlastníka odkazu, nebo null (vlastník neexistuje). */
export function outlineOf(model: Model, ref: OutlineRef): readonly Vec2[] | null {
  if (ref.outline === 'slabOpening') return model.slabOpenings[ref.ownerId]?.outline ?? null;
  const el = model.elements[ref.ownerId];
  return el?.category === 'slab' ? el.outline : null;
}

/** Platný odkaz: vlastník existuje a index hrany / rohu je v obrysu. */
export function outlineRefValid(model: Model, ref: OutlineRef): boolean {
  const pts = outlineOf(model, ref);
  const i = ref.edge ?? ref.vertex;
  return !!pts && i !== undefined && Number.isInteger(i) && i >= 0 && i < pts.length;
}

/** Podlaží vlastníka (kóta patří podlaží, základ 28). */
export function outlineStorey(model: Model, ref: OutlineRef): Id | null {
  if (ref.outline === 'slabOpening') return model.slabOpenings[ref.ownerId]?.storeyId ?? null;
  return model.elements[ref.ownerId]?.storeyId ?? null;
}

/** Hrana jako úsečka; roh jako krátká úsečka (2 mm) ve směru `dir` se středem v rohu. */
export function outlineRefPath(model: Model, ref: OutlineRef): Path {
  const pts = outlineOf(model, ref);
  if (!pts || !outlineRefValid(model, ref)) throw new Error(`Hrana desky ${ref.ownerId} neexistuje`);
  const n = pts.length;
  if (ref.edge !== undefined) {
    return { kind: 'line', start: pts[ref.edge] as Vec2, end: pts[(ref.edge + 1) % n] as Vec2 };
  }
  const p = pts[ref.vertex as number] as Vec2;
  const d = { x: Math.cos(ref.dir ?? 0), y: Math.sin(ref.dir ?? 0) };
  return { kind: 'line', start: sub(p, d), end: add(p, d) };
}

const isCorner = (r: DimRef): r is OutlineRef => isOutlineRef(r) && r.vertex !== undefined;
const angleOf = (v: Vec2) => Math.atan2(v.y, v.x);
const cornerPoint = (m: Model, r: OutlineRef) => outlineOf(m, r)?.[r.vertex as number] as Vec2;

/**
 * Doplní směr rohům páru: roh s lícem / hranou = rovnoběžně s ní; dva rohy = měří se větší z os
 * X / Y mezi nimi (Revit u bodů kótuje vodorovně nebo svisle). `path` = cesta odkazu, který není roh.
 */
export function orientPair(model: Model, a: DimRef, b: DimRef, path: (r: DimRef) => Path): [DimRef, DimRef] {
  const ca = isCorner(a);
  const cb = isCorner(b);
  if (!ca && !cb) return [a, b];
  if (ca && cb) {
    const v = sub(cornerPoint(model, b), cornerPoint(model, a));
    const dir = Math.abs(v.x) >= Math.abs(v.y) ? Math.PI / 2 : 0;
    return [
      { ...a, dir },
      { ...b, dir },
    ];
  }
  if (ca) return [{ ...a, dir: angleOf(tangentAt(path(b), 'start')) }, b];
  return [a, { ...(b as OutlineRef), dir: angleOf(tangentAt(path(a), 'start')) }];
}

/** Desky a otvory v deskách, na které kóta odkazuje. */
export function dimensionOutlineIds(d: Dimension): Id[] {
  return d.kind === 'linear' ? d.refs.flatMap((r) => (isOutlineRef(r) ? [r.ownerId] : [])) : [];
}

/** Smaže kóty, jejichž hrana nebo roh desky už neexistuje (smazaná deska, změněný počet bodů obrysu). */
export function pruneOutlineDimensions(model: Model): Model {
  const broken = Object.values(model.dimensions).filter(
    (d) => d.kind === 'linear' && d.refs.some((r) => isOutlineRef(r) && !outlineRefValid(model, r)),
  );
  return broken.length
    ? removeDimensions(
        model,
        broken.map((d) => d.id),
      )
    : model;
}

/** Posune vlastníka odkazu (deska i s otvory jen v ní, nebo otvor) o vektor – změna čísla kóty. */
export function translateOutlineOwner(model: Model, ref: OutlineRef, v: Vec2): Model {
  const shift = (pts: readonly Vec2[]) => pts.map((q) => add(q, v));
  if (ref.outline === 'slabOpening') {
    const o = model.slabOpenings[ref.ownerId];
    return o ? putSlabOpenings(model, [{ ...o, outline: shift(o.outline) }]) : model;
  }
  const el = model.elements[ref.ownerId];
  if (el?.category !== 'slab') return model;
  const own = Object.values(model.slabOpenings).filter((o) => o.hostIds.every((h) => h === el.id));
  const m = putSlabOpenings(
    model,
    own.map((o) => ({ ...o, outline: shift(o.outline) })),
  );
  return putElements(m, [{ ...el, outline: shift(el.outline) }]);
}
