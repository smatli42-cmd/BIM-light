// Migrace projektu 21 → 22 (desky D4): projekt dostane výchozí „Výkaz desek“, pokud ho ještě nemá.
import { SLABS_SCHEDULE } from './defaults.ts';

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

export function projectV21toV22(data: Obj): Obj {
  const schedules = isObj(data['schedules']) ? data['schedules'] : {};
  if (schedules[SLABS_SCHEDULE.id]) return data;
  return { ...data, schedules: { ...schedules, [SLABS_SCHEDULE.id]: SLABS_SCHEDULE } };
}
