// Migrace projektu 16 → 17 (desky D1): typy desek z knihovny a jejich skladby „pro desku“.
// Id jsou odvozená z klíče knihovny, takže opakovaná migrace dá stejný výsledek.
import type { Material } from '../material/types.ts';
import { SLAB_TYPE_LIBRARY, slabTypeFromLibrary } from './library.ts';

type Obj = Record<string, unknown>;

export function projectV16toV17(data: Obj): Obj {
  if (data['slabTypes']) return data;
  const mats = Object.values((data['materials'] ?? {}) as Record<string, Material>);
  const compositions = { ...((data['compositions'] ?? {}) as Obj) };
  const slabTypes: Obj = {};
  for (const item of SLAB_TYPE_LIBRARY) {
    const ids = { type: `slab-type-${item.key}`, composition: `slab-${item.key}` };
    const { type, composition } = slabTypeFromLibrary(item, mats, ids);
    slabTypes[type.id] = type;
    compositions[composition.id] = composition;
  }
  return { ...data, slabTypes, compositions };
}
