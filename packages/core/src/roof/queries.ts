// Dotazy nad střechami v modelu (bez změn dat) a tloušťky skladby vzhledem k referenční rovině.
import type { Id } from '../ids/index.ts';
import type { Model } from '../model/types.ts';
import type { WallLayer } from '../wall-type/types.ts';
import type { Roof } from './types.ts';

export const allRoofs = (model: Model): Roof[] =>
  Object.values(model.elements).filter((e): e is Roof => e.category === 'roof');

export function findRoof(model: Model, id: Id | null | undefined): Roof | undefined {
  const el = id ? model.elements[id] : undefined;
  return el?.category === 'roof' ? el : undefined;
}

export function roofLayers(model: Model, roof: Roof): readonly WallLayer[] {
  const t = model.roofTypes[roof.typeId];
  return (t && model.compositions[t.compositionId]?.layers) || [];
}

/**
 * Hranice vrstev kolmo k referenční rovině (mm): referenční rovina = spodní líc první nosné vrstvy
 * (funkce core), vrstvy pod ní mají záporné odsazení. `offsets.length = vrstvy + 1`.
 */
export function roofLayerOffsets(layers: readonly WallLayer[]): number[] {
  const core = Math.max(
    0,
    layers.findIndex((l) => l.function === 'core'),
  );
  let d = -layers.slice(0, core).reduce((s, l) => s + l.thickness, 0);
  const out = [d];
  for (const l of layers) out.push((d += l.thickness));
  return out;
}

/** Počet střech daného typu. */
export const roofTypeUsage = (model: Model, typeId: Id): number =>
  allRoofs(model).filter((r) => r.typeId === typeId).length;
