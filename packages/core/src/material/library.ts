// Výchozí knihovna materiálů (15 základních, vymyšlená data). Projekt dostane kopie s odkazem
// na původ (základ 21). Šrafu materiál jen odkazuje (základ 34); barva je u materiálu.
import { DEFAULT_PRIORITY, type Material, type MaterialCategory } from './types.ts';

export const MATERIAL_LIBRARY_ID = 'bim-light-basic';

export type LibraryMaterial = Omit<Material, 'id' | 'source'> & { readonly key: string };

const m = (
  key: string,
  name: string,
  category: MaterialCategory,
  hatchId: string,
  color: string,
  extra: Partial<LibraryMaterial> = {},
): LibraryMaterial => ({
  key,
  name,
  category,
  color,
  hatchId,
  hatchPen: 1,
  lineColor: null,
  fillColor: null,
  transparent3D: false,
  joinPriority: DEFAULT_PRIORITY[category],
  note: '',
  ...extra,
});

export const BASIC_MATERIALS: readonly LibraryMaterial[] = [
  m('masonry-ceramic', 'Zdivo keramické', 'Zdivo', 'hatch.zdivo', '#b5694a'),
  m('brick-solid', 'Cihly plné', 'Zdivo', 'hatch.zdivo-mrizka', '#a4553a'),
  m('masonry-existing', 'Stávající zdivo (neurčeno)', 'Zdivo', 'hatch.zdivo', '#8f7f72'),
  m('reinforced-concrete', 'Železobeton', 'Beton a potěry', 'hatch.beton-vyztuzeny', '#8c8c8c', {
    joinPriority: 70,
  }),
  m('concrete', 'Beton prostý', 'Beton a potěry', 'hatch.beton-prosty', '#a3a3a3'),
  m('anhydrite', 'Anhydrit', 'Beton a potěry', 'hatch.anhydrit', '#c9c2a8', { joinPriority: 55 }),
  m('mineral-wool', 'Minerální vata', 'Izolace', 'hatch.tepelna-izolace', '#d9c24a'),
  m('insulation-eps', 'Tepelná izolace EPS', 'Izolace', 'hatch.tepelna-izolace', '#e8e3b0'),
  m('wood', 'Dřevo', 'Dřevo', 'hatch.drevo', '#a8783f'),
  m('plaster', 'Omítka', 'Omítky', 'hatch.omitky', '#d8cfc0'),
  m('plasterboard', 'Sádrokarton', 'Ostatní', 'hatch.sadrokarton', '#cfcfc8', { joinPriority: 15 }),
  m('steel', 'Ocel', 'Kov', 'hatch.kovy', '#6f7c87'),
  m('gravel', 'Štěrk', 'Zemina a sypaniny', 'hatch.sterk', '#9c9483'),
  m('soil', 'Zemina', 'Zemina a sypaniny', 'hatch.teren', '#7a6045'),
  m('glass', 'Sklo', 'Sklo', 'hatch.sklo', '#9cc7d6', { transparent3D: true }),
];
