// Výchozí výkazy nového projektu (plán stěn Z8): výkaz stěn, výkaz materiálů stěn, legenda skladeb
// a výkaz desek (D4).
// Jsou to obyčejná data – uživatel (i AI) je upraví, smaže nebo přidá další stejným mechanismem.
import { DEFAULT_FILTER, type ScheduleDef } from './types.ts';

/** Výkaz desek (D4): po typech se součty ploch, obvodu a objemu. */
export const SLABS_SCHEDULE: ScheduleDef = {
  id: 'schedule-slabs',
  name: 'Výkaz desek',
  source: 'slabs',
  fields: ['mark', 'type', 'storey', 'thickness', 'count', 'area', 'netArea', 'perimeter', 'volume'],
  groupBy: ['mark', 'type', 'storey'],
  itemize: false,
  sortBy: null,
  filter: DEFAULT_FILTER,
  minOpeningArea: 0,
};

/** Výpis místností (prvky stavby 9): každá místnost na řádku, řazení podle čísla, součet ploch. */
export const ROOMS_SCHEDULE: ScheduleDef = {
  id: 'schedule-rooms',
  name: 'Výpis místností',
  source: 'rooms',
  fields: ['number', 'name', 'area', 'perimeter', 'height', 'volume', 'check'],
  groupBy: ['storey'],
  itemize: true,
  sortBy: 'number',
  filter: DEFAULT_FILTER,
  minOpeningArea: 0,
};

/**
 * Výkaz povrchů (prvky stavby 9): m² po místnostech a typech úprav, délky soklů. Rozpočtová praxe:
 * otvory do 4 m² se neodečítají a jejich ostění se nepřičítá; větší se odečtou a ostění přičte.
 */
export const COVERINGS_SCHEDULE: ScheduleDef = {
  id: 'schedule-coverings',
  name: 'Výkaz povrchů',
  source: 'coverings',
  fields: ['room', 'place', 'type', 'area', 'length'],
  groupBy: ['room', 'place', 'type'],
  itemize: false,
  sortBy: null,
  filter: DEFAULT_FILTER,
  minOpeningArea: 4,
  jambRule: 'deducted',
};

/** Výkaz dlaždic (prvky stavby 9, spárořez): po místnostech a typech celé, řezané a celkem s prořezem 10 %. */
export const TILES_SCHEDULE: ScheduleDef = {
  id: 'schedule-tiles',
  name: 'Výkaz dlaždic',
  source: 'tiles',
  fields: ['room', 'type', 'format', 'area', 'whole', 'cut', 'total', 'totalWithWaste'],
  groupBy: ['room', 'type'],
  itemize: false,
  sortBy: null,
  filter: DEFAULT_FILTER,
  minOpeningArea: 0,
  wastePercent: 10,
};

export const DEFAULT_SCHEDULES: readonly ScheduleDef[] = [
  {
    id: 'schedule-walls',
    name: 'Výkaz stěn',
    source: 'walls',
    fields: ['mark', 'type', 'thickness', 'count', 'length', 'grossArea', 'openingArea', 'netArea', 'volume'],
    groupBy: ['mark', 'type'],
    itemize: false,
    sortBy: null,
    filter: DEFAULT_FILTER,
    minOpeningArea: 0,
  },
  {
    id: 'schedule-materials',
    name: 'Výkaz materiálů stěn',
    source: 'wall-layers',
    fields: ['material', 'count', 'area', 'volume'],
    groupBy: ['material'],
    itemize: false,
    sortBy: null,
    filter: DEFAULT_FILTER,
    minOpeningArea: 0,
  },
  {
    id: 'schedule-legend',
    name: 'Legenda skladeb',
    source: 'wall-types',
    fields: ['mark', 'type', 'thickness', 'composition', 'function', 'loadBearing', 'fireRating'],
    groupBy: [],
    itemize: true,
    sortBy: 'mark',
    filter: DEFAULT_FILTER,
    minOpeningArea: 0,
  },
  SLABS_SCHEDULE,
  ROOMS_SCHEDULE,
  COVERINGS_SCHEDULE,
  TILES_SCHEDULE,
];

export const defaultSchedules = (): Record<string, ScheduleDef> =>
  Object.fromEntries(DEFAULT_SCHEDULES.map((s) => [s.id, s]));
