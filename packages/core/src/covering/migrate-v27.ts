// Migrace projektu 27 → 28: výchozí „Výkaz dlaždic“ (spárořez). Posun počátku spárořezu v místnosti je
// volitelný, starší místnosti ho nemají (= bez posunu).
import { TILES_SCHEDULE } from '../schedule/defaults.ts';

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

export function projectV27toV28(data: Obj): Obj {
  const schedules = isObj(data['schedules']) ? data['schedules'] : {};
  if (schedules[TILES_SCHEDULE.id]) return data;
  return { ...data, schedules: { ...schedules, [TILES_SCHEDULE.id]: TILES_SCHEDULE } };
}
