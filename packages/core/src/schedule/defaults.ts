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
];

export const defaultSchedules = (): Record<string, ScheduleDef> =>
  Object.fromEntries(DEFAULT_SCHEDULES.map((s) => [s.id, s]));
