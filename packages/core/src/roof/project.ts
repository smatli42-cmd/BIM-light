// Střechy v projektu (rozhodnutí 11, S1): typy střech z knihovny, jejich skladby a materiály, kopie šraf
// materiálů a grafika kategorie; nový projekt i migrace 41 → 42 (stabilní id, opakovaná migrace dá stejný výsledek).
import type { Composition } from '../composition/types.ts';
import { withHatchesFor } from '../hatch/project.ts';
import type { Material } from '../material/types.ts';
import type { DisplaySettings } from '../style/types.ts';
import { CATEGORY_GRAPHICS } from '../style/presets/defaults.ts';
import { roofLibraryFor } from './library.ts';

type Obj = Record<string, unknown>;

/** Grafika kategorie Střechy (patro 1): šrafa materiálu v řezu jako u desek. */
function withRoofDisplay(d: DisplaySettings): DisplaySettings {
  if (d.categoryGraphics.roof) return d;
  return { ...d, categoryGraphics: { ...d.categoryGraphics, roof: CATEGORY_GRAPHICS.roof ?? {} } };
}

/** Doplní typy střech, jejich skladby, materiály a šrafy (co projekt má, zůstane). */
export function withRoofLibrary<T extends Obj>(data: T): T {
  if (data['roofTypes']) return data;
  const materials = (data['materials'] ?? {}) as Record<string, Material>;
  const lib = roofLibraryFor(materials);
  const display = data['display'] as DisplaySettings | undefined;
  return {
    ...data,
    materials: lib.materials,
    roofTypes: lib.roofTypes,
    compositions: { ...((data['compositions'] ?? {}) as Record<string, Composition>), ...lib.compositions },
    ...(display ? { display: withRoofDisplay(withHatchesFor(display, Object.values(lib.materials))) } : {}),
  };
}

export const projectV41toV42 = (data: Obj): Obj => withRoofLibrary(data);
