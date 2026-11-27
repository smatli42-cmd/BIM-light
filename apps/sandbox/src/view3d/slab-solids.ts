// 3D tělesa desek (strop, základová deska, skladba podlahy) spočítaná z modelu: každá vrstva skladby je
// samostatné těleso s barvou svého materiálu, vrstvy jdou od spodního líce nahoru (skladba desky je od spodu),
// horní líc = úroveň podlaží + odsazení (slabLevels z jádra). Půdorys = obrys desky. Jádro se jen čte.
import { slabLevels, type Model, type Slab as SlabElement } from '@bim-light/core';
import { sliceLayer } from './slice.ts';
import type { Solid } from './solids.ts';

const FALLBACK_COLOR = '#c8c8c8';

/** Tělesa jedné desky (po vrstvách skladby, zdola). */
export function slabSolids(model: Model, slab: SlabElement): Solid[] {
  const type = model.slabTypes[slab.typeId];
  const comp = type ? model.compositions[type.compositionId] : undefined;
  if (!comp) return [];
  let z = slabLevels(model, slab).bottom;
  return comp.layers.flatMap((layer) => {
    const z0 = z;
    z += layer.thickness;
    const slabs = sliceLayer([slab.outline], z0, z, []);
    if (!slabs.length) return [];
    const materialId = layer.materialId ?? null;
    const mat = materialId ? model.materials[materialId] : undefined;
    return [
      {
        elementId: slab.id,
        materialId,
        color: mat?.color ?? FALLBACK_COLOR,
        transparent: mat?.transparent3D ?? false,
        slabs,
      },
    ];
  });
}
