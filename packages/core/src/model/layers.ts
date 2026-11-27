// Vrstvy skladby prvku bez ohledu na druh (stěna = všechny pásy typu, deska = skladba typu).
// Používá grafika (materiál ve skladbě), výkazy a hledání.
import type { WallLayer } from '../wall-type/types.ts';
import type { Element, Model } from './types.ts';

export function elementLayers(model: Model, el: Element): readonly WallLayer[] {
  if (el.category === 'slab') {
    const t = model.slabTypes[el.typeId];
    return (t && model.compositions[t.compositionId]?.layers) || [];
  }
  return model.wallTypes[el.typeId]?.bands.flatMap((b) => b.layers) ?? [];
}
