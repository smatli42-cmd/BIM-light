// Výchozí knihovna typů desek (vymyšlená data). Vrstvy odkazují materiály klíčem, od spodu nahoru.
// Projekt dostane kopie s odkazem na původ (základ 21) a ke každému typu skladbu „pro desku“.
import type { Composition } from '../composition/types.ts';
import type { Id } from '../ids/index.ts';
import type { Material } from '../material/types.ts';
import type { LibraryLayer } from '../wall-type/library.ts';
import type { WallLayer } from '../wall-type/types.ts';
import type { SlabFunction, SlabType } from './types.ts';

export const SLAB_TYPE_LIBRARY_ID = 'bim-light-slab-types';

export interface LibrarySlabType {
  readonly key: string;
  readonly name: string;
  readonly mark: string;
  readonly slabFunction: SlabFunction;
  readonly loadBearing: boolean;
  readonly layers: readonly LibraryLayer[];
}

const L = (material: string, thickness: number, fn: LibraryLayer['function']): LibraryLayer => ({
  material,
  thickness,
  function: fn,
});

export const SLAB_TYPE_LIBRARY: readonly LibrarySlabType[] = [
  {
    key: 'rc-250',
    name: 'ŽB strop 250',
    mark: 'D1',
    slabFunction: 'structure',
    loadBearing: true,
    layers: [L('plaster', 10, 'finish'), L('reinforced-concrete', 250, 'core')],
  },
  {
    key: 'rc-base-300',
    name: 'ŽB základová deska 300',
    mark: 'D2',
    slabFunction: 'structure',
    loadBearing: true,
    layers: [L('gravel', 150, 'finish'), L('reinforced-concrete', 300, 'core')],
  },
  {
    key: 'floor-anhydrite-150',
    name: 'Podlaha anhydrit 150',
    mark: 'P1',
    slabFunction: 'floor',
    loadBearing: false,
    layers: [L('insulation-eps', 100, 'insulation'), L('anhydrite', 50, 'core')],
  },
  {
    key: 'floor-wood-120',
    name: 'Podlaha dřevěná 120',
    mark: 'P2',
    slabFunction: 'floor',
    loadBearing: false,
    layers: [L('mineral-wool', 80, 'insulation'), L('wood', 40, 'core')],
  },
];

/** Typ desky + jeho skladba z položky knihovny. `ids` dává id typu a skladby. */
export function slabTypeFromLibrary(
  item: LibrarySlabType,
  materials: readonly Material[],
  ids: { type: Id; composition: Id },
): { type: SlabType; composition: Composition } {
  const byKey = (key: string) => materials.find((m) => m.source?.itemId === key)?.id ?? '';
  const layers: WallLayer[] = item.layers.map((l) => ({
    materialId: byKey(l.material),
    thickness: l.thickness,
    function: l.function,
    extendTop: 0,
    extendBottom: 0,
  }));
  return {
    type: {
      id: ids.type,
      name: item.name,
      mark: item.mark,
      slabFunction: item.slabFunction,
      compositionId: ids.composition,
      loadBearing: item.loadBearing,
      source: { libraryId: SLAB_TYPE_LIBRARY_ID, itemId: item.key, version: 1 },
    },
    composition: {
      id: ids.composition,
      name: item.name,
      layers,
      use: { wall: false, slab: true, roof: false },
    },
  };
}

/** Celá knihovna jako typy a skladby projektu. */
export function slabLibraryForProject(materials: readonly Material[], newId: () => Id) {
  return SLAB_TYPE_LIBRARY.map((item) =>
    slabTypeFromLibrary(item, materials, { type: newId(), composition: newId() }),
  );
}
