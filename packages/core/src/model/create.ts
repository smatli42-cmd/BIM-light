// Nový prázdný projekt: budova, podlaží 1.NP, knihovní materiály, výchozí typy stěn,
// nastavení zobrazení (Studie, Projekt) s kopiemi použitých šraf a pohled. Ukázková data jsou vymyšlená.
import type { Id, IdGenerator } from '../ids/index.ts';
import { BASIC_MATERIALS, MATERIAL_LIBRARY_ID } from '../material/library.ts';
import type { Material } from '../material/types.ts';
import { withHatchesFor } from '../hatch/project.ts';
import { createDefaultDisplay } from '../style/presets/create.ts';
import type { View } from '../view/types.ts';
import type { WallType } from '../wall/types.ts';
import { SCHEMA_VERSION, type Model } from './types.ts';

const byId = <T extends { id: Id }>(items: T[]): Record<Id, T> =>
  Object.fromEntries(items.map((i) => [i.id, i]));

function materials(newId: IdGenerator): Material[] {
  return BASIC_MATERIALS.map(({ key, ...m }) => ({
    ...m,
    id: newId(),
    source: { libraryId: MATERIAL_LIBRARY_ID, itemId: key, version: 1 },
  }));
}

/** Výchozí typy: zdivo 300 a příčka 125 (jedna vrstva), sendvič se zateplením (tři vrstvy). */
function wallTypes(mats: Material[], newId: IdGenerator): WallType[] {
  const mat = (name: string) => mats.find((m) => m.name === name)?.id ?? '';
  const single = (name: string, material: string, t: number): WallType => ({
    id: newId(),
    name,
    bands: [{ height: null, layers: [{ materialId: mat(material), thickness: t, function: 'core' }] }],
  });
  return [
    single('Zdivo 300', 'Zdivo keramické', 300),
    single('Příčka 125', 'Zdivo keramické', 125),
    {
      id: newId(),
      name: 'Obvodová zateplená 465',
      bands: [
        {
          height: null,
          layers: [
            { materialId: mat('Omítka'), thickness: 15, function: 'finish' },
            { materialId: mat('Zdivo keramické'), thickness: 300, function: 'core' },
            { materialId: mat('Tepelná izolace EPS'), thickness: 150, function: 'insulation' },
          ],
        },
      ],
    },
  ];
}

export function createEmptyProject(newId: IdGenerator, name = 'Nový projekt'): Model {
  const buildingId = newId();
  const storeyId = newId();
  const mats = materials(newId);
  const display = withHatchesFor(createDefaultDisplay(newId), mats);
  const study = Object.values(display.styles)[0];
  if (!study) throw new Error('Chybí výchozí styl');
  const view: View = {
    id: newId(),
    name: `1.NP – ${study.name}`,
    storeyId,
    crop: null,
    scale: study.defaultScale,
    styleId: study.id,
    local: {},
    activeAnnotationLayerId: null,
    elementOverrides: {},
  };
  return {
    schemaVersion: SCHEMA_VERSION,
    project: { id: newId(), name, georef: { sjtskY: 0, sjtskX: 0, rotationDeg: 0, elevationBpv: 0 } },
    buildings: { [buildingId]: { id: buildingId, name: 'Budova' } },
    storeys: { [storeyId]: { id: storeyId, name: '1.NP', buildingId, elevation: 0, height: 3000 } },
    materials: byId(mats),
    wallTypes: byId(wallTypes(mats, newId)),
    elements: {},
    relations: {},
    dimensions: {},
    variantSets: {},
    display,
    views: { [view.id]: view },
  };
}
