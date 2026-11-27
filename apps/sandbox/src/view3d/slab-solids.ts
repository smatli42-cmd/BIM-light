// 3D tělesa desek (strop, základová deska, skladba podlahy) spočítaná z modelu: každá vrstva skladby je
// samostatné těleso s barvou svého materiálu, vrstvy jdou od spodního líce nahoru (skladba desky je od spodu),
// horní líc = úroveň podlaží + odsazení (slabLevels z jádra). Půdorys = obrys desky minus otvory v desce
// (D3, svislý řez přes celou tloušťku). Jádro se jen čte.
import { slabLevels, type Model, type Slab as SlabElement, type Vec2 } from '@bim-light/core';
import { sliceLayer, type Cutter } from './slice.ts';
import { materialOpacity, type Solid } from './solids.ts';

const FALLBACK_COLOR = '#c8c8c8';

/** Tělesa jedné desky (po vrstvách skladby, zdola); `holes` = obrysy otvorů v desce, které ji prořízne. */
export function slabSolids(
  model: Model,
  slab: SlabElement,
  holes: readonly (readonly Vec2[])[] = [],
): Solid[] {
  const type = model.slabTypes[slab.typeId];
  const comp = type ? model.compositions[type.compositionId] : undefined;
  if (!comp) return [];
  const lv = slabLevels(model, slab);
  const cutters: Cutter[] = holes.map((footprint) => ({ footprint, bottom: lv.bottom - 1, top: lv.top + 1 }));
  let z = lv.bottom;
  return comp.layers.flatMap((layer) => {
    const z0 = z;
    z += layer.thickness;
    const slabs = sliceLayer([slab.outline], z0, z, cutters);
    if (!slabs.length) return [];
    const materialId = layer.materialId ?? null;
    const mat = materialId ? model.materials[materialId] : undefined;
    return [
      {
        elementId: slab.id,
        materialId,
        color: mat?.color ?? FALLBACK_COLOR,
        opacity: materialOpacity(mat),
        slabs,
      },
    ];
  });
}
