// Výchozí knihovna materiálů (skupina „základní“). Projekt dostane kopie s odkazem na původ (základ 21).
// Barvy a pera jsou data, ne kód generátoru (základy 11, 32): pero 1 = tenká čára pro šrafy.
import type { Material } from './types.ts';

export const MATERIAL_LIBRARY_ID = 'bim-light-basic';

type LibraryMaterial = Omit<Material, 'id' | 'source'> & { readonly key: string };

const m = (
  key: string,
  name: string,
  group: string,
  patternId: string,
  cutFillColor: string,
  joinPriority: number,
): LibraryMaterial => ({
  key,
  name,
  group,
  hatch: { patternId, pen: 1, color: '#000000' },
  cutFillColor,
  joinPriority,
});

export const BASIC_MATERIALS: readonly LibraryMaterial[] = [
  m('masonry-ceramic', 'Zdivo keramické', 'zdivo', 'masonry', '#c9b8a6', 50),
  m('masonry-existing', 'Stávající zdivo (neurčeno)', 'zdivo', 'masonry-existing', '#b8b2aa', 50),
  m('concrete', 'Beton', 'beton', 'concrete', '#c4c4c4', 60),
  m('reinforced-concrete', 'Železobeton', 'beton', 'reinforced-concrete', '#a9a9a9', 70),
  m('insulation-eps', 'Tepelná izolace EPS', 'izolace', 'insulation', '#f1e9a6', 20),
  m('wood', 'Dřevo', 'dřevo', 'wood', '#d8b98a', 40),
  m('plaster', 'Omítka', 'omítka', 'plaster', '#ece6dc', 10),
];
