// Migrace na verzi 2 (základy 9, 34): šrafa už není zabudovaná do materiálu, je to položka knihovny.
// Balíček zobrazení 1 → 2: přibudou kopie šraf; pevná šrafa v efektech (patternId) → id šrafy.
// Projekt 1 → 2: materiál {group, hatch, cutFillColor} → {category, color, hatchId, …} + kopie šraf.
import { hatchCopy, libraryHatch, NO_HATCH } from './registry.ts';
import type { Hatch } from './types.ts';

type Obj = Record<string, unknown>;

/** Staré id vzorů (krok 2) → id šraf v knihovně. */
export const OLD_PATTERN_IDS: Readonly<Record<string, string>> = {
  none: NO_HATCH,
  masonry: 'hatch.zdivo',
  'masonry-existing': 'hatch.zdivo',
  concrete: 'hatch.beton-prosty',
  'reinforced-concrete': 'hatch.beton-vyztuzeny',
  insulation: 'hatch.tepelna-izolace',
  wood: 'hatch.drevo',
  plaster: 'hatch.omitky',
};

const OLD_GROUPS: Readonly<Record<string, string>> = {
  zdivo: 'Zdivo',
  beton: 'Beton a potěry',
  izolace: 'Izolace',
  dřevo: 'Dřevo',
  omítka: 'Omítky',
};

const newHatchId = (old: unknown) => OLD_PATTERN_IDS[String(old)] ?? NO_HATCH;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Projde data a převede každé `hatch: {patternId, pen, color}` na nový tvar efektu. */
function migrateEffects(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(migrateEffects);
  if (!isObj(v)) return v;
  const out: Obj = {};
  for (const [k, val] of Object.entries(v)) {
    if (k === 'hatch' && isObj(val) && 'patternId' in val) {
      out[k] = {
        hatchId: newHatchId(val['patternId']),
        pen: val['pen'] ?? 1,
        lineColor: val['color'] ?? null,
      };
    } else out[k] = migrateEffects(val);
  }
  return out;
}

function copies(ids: readonly string[]): Record<string, Hatch> {
  const out: Record<string, Hatch> = {};
  for (const id of ids) {
    const lib = libraryHatch(id);
    if (lib) out[id] = hatchCopy(lib);
  }
  return out;
}

/** Balíček zobrazení 1 → 2. */
export function displayV1toV2(data: Obj): Obj {
  const migrated = migrateEffects(data) as Obj;
  const used = JSON.stringify(migrated).match(/hatch\.[a-z0-9-]+/g) ?? [];
  return { ...migrated, hatches: copies([...new Set(used)]) };
}

function materialV2(m: Obj): Obj {
  const hatch = isObj(m['hatch']) ? m['hatch'] : {};
  const { group, hatch: _h, cutFillColor, ...rest } = m;
  return {
    ...rest,
    category: OLD_GROUPS[String(group)] ?? 'Ostatní',
    color: typeof cutFillColor === 'string' ? cutFillColor : '#bfbfbf',
    hatchId: newHatchId(hatch['patternId']),
    hatchPen: typeof hatch['pen'] === 'number' ? hatch['pen'] : 1,
    lineColor: typeof hatch['color'] === 'string' ? hatch['color'] : null,
    fillColor: typeof cutFillColor === 'string' ? cutFillColor : null,
    transparent3D: false,
    note: '',
  };
}

/** Projekt 1 → 2 (materiály, balíček zobrazení a kopie šraf, které materiály používají). */
export function projectV1toV2(data: Obj): Obj {
  const mats = isObj(data['materials']) ? data['materials'] : {};
  const materials = Object.fromEntries(
    Object.entries(mats).map(([id, m]) => [id, isObj(m) ? materialV2(m) : m]),
  );
  const display = displayV1toV2(isObj(data['display']) ? data['display'] : {});
  const usedByMaterials = Object.values(materials).map((m) => String((m as Obj)['hatchId']));
  const hatches = { ...copies(usedByMaterials), ...(display['hatches'] as Obj) };
  return { ...data, materials, display: { ...display, schemaVersion: 2, hatches } };
}
