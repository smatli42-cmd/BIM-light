// Migrace projektu 26 → 27: typy úprav povrchů (knihovna), materiály úprav, šrafy k nim a výchozí
// „Výkaz povrchů“. Přiřazení v místnostech je volitelné, starší místnosti ho nemají.
import { withHatchesFor } from '../hatch/project.ts';
import type { Material } from '../material/types.ts';
import { COVERINGS_SCHEDULE } from '../schedule/defaults.ts';
import type { DisplaySettings } from '../style/types.ts';
import { coveringLibraryFor } from './library.ts';

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

export function projectV26toV27(data: Obj): Obj {
  if (isObj(data['coveringTypes'])) return data;
  const materials = (isObj(data['materials']) ? data['materials'] : {}) as Record<string, Material>;
  const lib = coveringLibraryFor(materials);
  const schedules = isObj(data['schedules']) ? data['schedules'] : {};
  const display = data['display'] as DisplaySettings | undefined;
  return {
    ...data,
    materials: lib.materials,
    coveringTypes: lib.types,
    ...(display?.hatches && { display: withHatchesFor(display, Object.values(lib.materials)) }),
    schedules: schedules[COVERINGS_SCHEDULE.id]
      ? schedules
      : { ...schedules, [COVERINGS_SCHEDULE.id]: COVERINGS_SCHEDULE },
  };
}
