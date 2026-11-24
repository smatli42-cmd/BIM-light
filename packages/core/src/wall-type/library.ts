// Výchozí knihovna typů stěn (plán stěn Z1; vymyšlená data). Vrstvy odkazují materiály z knihovny
// materiálů klíčem; projekt dostane kopie typů s odkazem na původ (základ 21).
import type { IdGenerator } from '../ids/index.ts';
import type { HeightBand, LayerFunction, WallType } from './types.ts';

export const WALL_TYPE_LIBRARY_ID = 'bim-light-wall-types';

export interface LibraryLayer {
  /** Klíč materiálu v knihovně materiálů (např. „plaster“). */
  readonly material: string;
  readonly thickness: number;
  readonly function: LayerFunction;
}

export interface LibraryWallType {
  readonly key: string;
  readonly name: string;
  readonly layers: readonly LibraryLayer[];
}

const L = (material: string, thickness: number, fn: LayerFunction): LibraryLayer => ({
  material,
  thickness,
  function: fn,
});

/** Pořadí vrstev: od referenční (vnitřní) strany ke straně tloušťky. */
export const WALL_TYPE_LIBRARY: readonly LibraryWallType[] = [
  { key: 'masonry-300', name: 'Zdivo 300', layers: [L('masonry-ceramic', 300, 'core')] },
  { key: 'partition-125', name: 'Příčka 125', layers: [L('masonry-ceramic', 125, 'core')] },
  {
    key: 'external-465',
    name: 'Obvodová zateplená 465',
    layers: [
      L('plaster', 15, 'finish'),
      L('masonry-ceramic', 300, 'core'),
      L('insulation-eps', 150, 'insulation'),
    ],
  },
  {
    key: 'bearing-330',
    name: 'Nosná zeď 330',
    layers: [L('plaster', 15, 'finish'), L('masonry-ceramic', 300, 'core'), L('plaster', 15, 'finish')],
  },
  {
    key: 'partition-100',
    name: 'Příčka 100',
    layers: [L('plaster', 10, 'finish'), L('masonry-ceramic', 80, 'core'), L('plaster', 10, 'finish')],
  },
  {
    key: 'partition-150',
    name: 'Příčka 150',
    layers: [L('plaster', 10, 'finish'), L('masonry-ceramic', 130, 'core'), L('plaster', 10, 'finish')],
  },
  { key: 'rc-200', name: 'ŽB stěna 200', layers: [L('reinforced-concrete', 200, 'core')] },
  {
    key: 'drywall-100',
    name: 'SDK příčka 100',
    layers: [
      L('plasterboard', 12.5, 'finish'),
      L('mineral-wool', 75, 'core'),
      L('plasterboard', 12.5, 'finish'),
    ],
  },
];

export const libraryWallTypeByKey = (key: string): LibraryWallType | undefined =>
  WALL_TYPE_LIBRARY.find((t) => t.key === key);

/** Kopie knihovního typu do projektu; `materialId` převede klíč materiálu na id v projektu. */
export function wallTypeFromLibrary(
  item: LibraryWallType,
  materialId: (key: string) => string,
  newId: IdGenerator,
): WallType {
  const band: HeightBand = {
    height: null,
    layers: item.layers.map((l) => ({
      materialId: materialId(l.material),
      thickness: l.thickness,
      function: l.function,
      extendTop: 0,
      extendBottom: 0,
    })),
  };
  return {
    id: newId(),
    name: item.name,
    bands: [band],
    source: { libraryId: WALL_TYPE_LIBRARY_ID, itemId: item.key, version: 1 },
  };
}
