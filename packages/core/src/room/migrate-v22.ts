// Migrace projektu 22 → 23 (místnosti): prázdný seznam místností a výchozí „Výpis místností“.
import { ROOMS_SCHEDULE } from '../schedule/defaults.ts';

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
