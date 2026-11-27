// Nový prázdný projekt: budova, podlaží 1.NP, knihovní materiály, výchozí typy stěn,
// nastavení zobrazení (Studie, Projekt) s kopiemi použitých šraf a pohled. Ukázková data jsou vymyšlená.
import { defaultRoomCategories } from '../room/category.ts';
import { coveringLibraryFor } from '../covering/library.ts';
import { newView3d } from '../view-3d/types.ts';
import { ensureCompositions } from '../composition/store.ts';
import type { Id, IdGenerator } from '../ids/index.ts';
import { BASIC_MATERIALS, MATERIAL_LIBRARY_ID } from '../material/library.ts';
import type { Material } from '../material/types.ts';
import { withHatchesFor } from '../hatch/project.ts';
import { createDefaultDisplay } from '../style/presets/create.ts';
import type { View } from '../view/types.ts';
import type { WallType } from '../wall/types.ts';
import { WALL_TYPE_LIBRARY, wallTypeFromLibrary } from '../wall-type/library.ts';
import { DEFAULT_CUT_HEIGHT } from '../wall/layers.ts';
import { SCHEMA_VERSION, type Model } from './types.ts';
import { defaultSchedules } from '../schedule/defaults.ts';
import { slabLibraryForProject } from '../slab/library.ts';

const byId = <T extends { id: Id }>(items: T[]): Record<Id, T> =>
  Object.fromEntries(items.map((i) => [i.id, i]));

function materials(newId: IdGenerator): Material[] {
  return BASIC_MATERIALS.map(({ key, ...m }) => ({
    ...m,
    id: newId(),
    source: { libraryId: MATERIAL_LIBRARY_ID, itemId: key, version: 1 },
  }));
}

/** Výchozí typy = kopie celé knihovny typů s odkazem na původ (základ 21). */
function wallTypes(mats: Material[], newId: IdGenerator): WallType[] {
  const byKey = (key: string) => mats.find((m) => m.source?.itemId === key)?.id ?? '';
  return WALL_TYPE_LIBRARY.map((item, i) => ({
    ...wallTypeFromLibrary(item, byKey, newId),
    mark: `S${i + 1}`,
  }));
}

export function createEmptyProject(newId: IdGenerator, name = 'Nový projekt'): Model {
  return ensureCompositions(emptyProject(newId, name));
}

function emptyProject(newId: IdGenerator, name: string): Model {
  const buildingId = newId();
  const storeyId = newId();
  const mats = materials(newId);
  const covering = coveringLibraryFor(byId(mats));
  const display = withHatchesFor(createDefaultDisplay(newId), Object.values(covering.materials));
  const slabs = slabLibraryForProject(mats, newId);
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
    cutPlane: DEFAULT_CUT_HEIGHT,
    elementOverrides: {},
    saved: false,
    phaseFilterId: null,
  };
  const model: Omit<Model, 'views3d'> = {
    sections: {},
    schemaVersion: SCHEMA_VERSION,
    project: { id: newId(), name, georef: { sjtskY: 0, sjtskX: 0, rotationDeg: 0, elevationBpv: 0 } },
    buildings: { [buildingId]: { id: buildingId, name: 'Budova' } },
    storeys: { [storeyId]: { id: storeyId, name: '1.NP', buildingId, elevation: 0, height: 3000 } },
    materials: covering.materials,
    wallTypes: byId(wallTypes(mats, newId)),
    slabTypes: byId(slabs.map((s) => s.type)),
    compositions: byId(slabs.map((s) => s.composition)),
    elements: {},
    openings: {},
    slabOpenings: {},
    rooms: {},
    roomCategories: defaultRoomCategories(),
    coveringTypes: covering.types,
    relations: {},
    dimensions: {},
    variantSets: {},
    display,
    views: { [view.id]: view },
    schedules: defaultSchedules(),
    wallTags: {},
  };
  // Výchozí 3D pohled (jako {3D} v Revitu); id se bere až na konci, ostatní id se neposunou.
  const view3d = newView3d(newId(), '3D', study.id);
  return { ...model, views3d: { [view3d.id]: view3d } };
}
