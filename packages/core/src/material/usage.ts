// „Použití“ materiálu se počítá z modelu, neukládá se (katalog šraf a materiálů).
import type { Id } from '../ids/index.ts';
import { elementLayers } from '../model/layers.ts';
import type { Model } from '../model/types.ts';

export interface MaterialUsage {
  /** Počet prvků (stěn, desek), jejichž typ materiál používá. */
  readonly elements: number;
  /** Počet typů (stěn a desek), jejichž skladba materiál používá. */
  readonly types: number;
}

export function materialUsage(model: Model, materialId: Id): MaterialUsage {
  const has = (ls: readonly { materialId: Id }[]) => ls.some((l) => l.materialId === materialId);
  const walls = Object.values(model.wallTypes).filter((t) => t.bands.some((b) => has(b.layers))).length;
  const slabs = Object.values(model.slabTypes).filter((t) =>
    has(model.compositions[t.compositionId]?.layers ?? []),
  ).length;
  const elements = Object.values(model.elements).filter((e) => has(elementLayers(model, e))).length;
  return { elements, types: walls + slabs };
}
