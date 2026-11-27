// Dotazy nad deskami v modelu (bez změn dat).
import type { Id } from '../ids/index.ts';
import type { Model } from '../model/types.ts';
import type { Slab, SlabType } from './types.ts';

export const allSlabs = (model: Model): Slab[] =>
  Object.values(model.elements).filter((e): e is Slab => e.category === 'slab');

export function getSlab(model: Model, id: Id): Slab {
  const el = model.elements[id];
  if (!el || el.category !== 'slab') throw new Error(`Deska ${id} neexistuje`);
  return el;
}

export function findSlab(model: Model, id: Id | null | undefined): Slab | undefined {
  const el = id ? model.elements[id] : undefined;
  return el?.category === 'slab' ? el : undefined;
}

/** Typy desek, které používají skladbu. */
export const slabTypeUsers = (model: Model, compositionId: Id): SlabType[] =>
  Object.values(model.slabTypes).filter((t) => t.compositionId === compositionId);

/** Počet desek daného typu. */
export const slabTypeUsage = (model: Model, typeId: Id): number =>
  allSlabs(model).filter((s) => s.typeId === typeId).length;
