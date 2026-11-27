// Migrace projektu 22 → 23 (místnosti: prázdný seznam, výchozí „Výpis místností“) a 23 → 24 (kategorie).
import { ROOMS_SCHEDULE } from '../schedule/defaults.ts';
import { defaultRoomCategories } from './category.ts';

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

export function projectV22toV23(data: Obj): Obj {
  const schedules = isObj(data['schedules']) ? data['schedules'] : {};
  return {
    ...data,
    rooms: isObj(data['rooms']) ? data['rooms'] : {},
    schedules: schedules[ROOMS_SCHEDULE.id]
      ? schedules
      : { ...schedules, [ROOMS_SCHEDULE.id]: ROOMS_SCHEDULE },
  };
}

/** Migrace 23 → 24: výchozí kategorie místností (barva, obytná / užitková plocha). */
export function projectV23toV24(data: Obj): Obj {
  return isObj(data['roomCategories']) ? data : { ...data, roomCategories: defaultRoomCategories() };
}
