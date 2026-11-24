// Šrafy v projektu (základy 21, 34): projekt drží kopie použitých šraf z knihovny s odkazem na původ,
// aby byl soběstačný. Materiály odkazují id šrafy; kresba bere šrafu z projektu.
import type { Material } from '../material/types.ts';
import type { DisplaySettings } from '../style/types.ts';
import { hatchCopy, libraryHatch } from './registry.ts';
import type { Hatch } from './types.ts';

/** Šrafa projektu podle id (kopie), nebo undefined. */
export const projectHatch = (display: DisplaySettings, id: string): Hatch | undefined => display.hatches[id];

/** Doplní do projektu kopie šraf z knihovny, které materiály používají a projekt ještě nemá. */
export function withHatchesFor(display: DisplaySettings, materials: readonly Material[]): DisplaySettings {
  const add: Record<string, Hatch> = {};
  for (const m of materials) {
    if (display.hatches[m.hatchId] || add[m.hatchId]) continue;
    const lib = libraryHatch(m.hatchId);
    if (lib) add[m.hatchId] = hatchCopy(lib);
  }
  return Object.keys(add).length ? { ...display, hatches: { ...display.hatches, ...add } } : display;
}

/** Doplní kopii šrafy z pevně nastaveného efektu (pravidlo, přepis prvku); neznámá šrafa = chyba. */
export function withHatchOfEffect(display: DisplaySettings, effect: unknown): DisplaySettings | null {
  const hatch = (effect as { hatch?: unknown } | null)?.hatch;
  if (!hatch || typeof hatch !== 'object') return display;
  const id = (hatch as { hatchId: string }).hatchId;
  if (display.hatches[id]) return display;
  const lib = libraryHatch(id);
  return lib ? { ...display, hatches: { ...display.hatches, [id]: hatchCopy(lib) } } : null;
}

/** Je šrafa k dispozici (v projektu nebo v knihovně)? */
export const hatchExists = (display: DisplaySettings, id: string): boolean =>
  !!display.hatches[id] || !!libraryHatch(id);
