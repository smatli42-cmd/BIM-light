// „Použití“ materiálu se počítá z modelu, neukládá se (katalog šraf a materiálů).
import type { Id } from '../ids/index.ts';
import type { Model } from '../model/types.ts';

export interface MaterialUsage {
  /** Počet prvků, jejichž typ materiál používá. */
  readonly elements: number;
  /** Počet skladeb (typů), které materiál používají. */
  readonly types: number;
}

const typeUses = (model: Model, typeId: Id, materialId: Id): boolean =>
  !!model.wallTypes[typeId]?.bands.some((b) => b.layers.some((l) => l.materialId === materialId));

export function materialUsage(model: Model, materialId: Id): MaterialUsage {
  const types = Object.values(model.wallTypes).filter((t) => typeUses(model, t.id, materialId)).length;
  const elements = Object.values(model.elements).filter((e) => typeUses(model, e.typeId, materialId)).length;
  return { elements, types };
}
