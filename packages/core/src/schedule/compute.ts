// Výpočet tabulky výkazu (základ 8): stejný postup pro všechny zdroje – filtr, zaokrouhlení, řazení,
// seskupení, součty. Hodnoty se zaokrouhlí už na řádku, takže součet sedí s ručním přepočtem řádků.
import type { Model } from '../model/types.ts';
import { roundDecimals, type ScheduleField, type ScheduleSourceDef } from './fields.ts';
import { LAYERS_SOURCE } from './source-layers.ts';
import { TYPES_SOURCE } from './source-types.ts';
import { WALLS_SOURCE } from './source-walls.ts';
import { SLABS_SOURCE } from './source-slabs.ts';
import { ROOMS_SOURCE } from './source-rooms.ts';
import { COVERINGS_SOURCE } from './source-coverings.ts';
import type { CellValue, ScheduleDef, ScheduleRow, ScheduleSource } from './types.ts';

export const SCHEDULE_SOURCE_DEFS: Readonly<Record<ScheduleSource, ScheduleSourceDef>> = {
  walls: WALLS_SOURCE,
  'wall-layers': LAYERS_SOURCE,
  'wall-types': TYPES_SOURCE,
  slabs: SLABS_SOURCE,
  rooms: ROOMS_SOURCE,
  coverings: COVERINGS_SOURCE,
};

export interface ScheduleTableRow {
  /** item = prvek nebo skupina se součty; group = záhlaví skupiny; subtotal = mezisoučet; total = celkem. */
  readonly kind: 'item' | 'group' | 'subtotal' | 'total';
  readonly cells: ScheduleRow;
  /** Text záhlaví skupiny, mezisoučtu a celkového součtu. */
  readonly label?: string;
}

export interface ScheduleTable {
  readonly id: string;
  readonly name: string;
  readonly columns: readonly ScheduleField[];
  readonly rows: readonly ScheduleTableRow[];
}

const cmp = (a: CellValue | undefined, b: CellValue | undefined) =>
  typeof a === 'number' && typeof b === 'number'
    ? a - b
    : String(a ?? '').localeCompare(String(b ?? ''), 'cs', { numeric: true });

function rounded(row: ScheduleRow, fields: readonly ScheduleField[]): ScheduleRow {
  const out: Record<string, CellValue> = { ...row };
  for (const f of fields) {
    const v = row[f.key];
    if (typeof v === 'number') out[f.key] = roundDecimals(v, f.decimals);
  }
  return out;
}

/** Součty sčítaných polí; ostatní pole jen, když mají všechny řádky stejnou hodnotu. */
function aggregate(
  rows: readonly ScheduleRow[],
  fields: readonly ScheduleField[],
  all: boolean,
): ScheduleRow {
  const out: Record<string, CellValue> = {};
  for (const f of fields) {
    if (f.sum)
      out[f.key] = roundDecimals(
        rows.reduce((s, r) => s + Number(r[f.key] ?? 0), 0),
        f.decimals,
      );
    else if (all && rows.length && rows.every((r) => r[f.key] === rows[0]?.[f.key])) {
      const v = rows[0]?.[f.key];
      if (v !== undefined) out[f.key] = v;
    }
  }
  return out;
}

/** Jen buňky zobrazených sloupců. */
function only(r: ScheduleRow, cols: readonly ScheduleField[]): ScheduleRow {
  const out: Record<string, CellValue> = {};
  for (const c of cols) {
    const v = r[c.key];
    if (v !== undefined) out[c.key] = v;
  }
  return out;
}

const groupKey = (r: ScheduleRow, by: readonly string[]) => JSON.stringify(by.map((k) => r[k] ?? ''));

function groupsOf(rows: readonly ScheduleRow[], by: readonly string[]): ScheduleRow[][] {
  const map = new Map<string, ScheduleRow[]>();
  for (const r of rows) map.set(groupKey(r, by), [...(map.get(groupKey(r, by)) ?? []), r]);
  return [...map.values()];
}

/** Spočítá tabulku výkazu z modelu. */
export function computeSchedule(m: Model, def: ScheduleDef): ScheduleTable {
  const source = SCHEDULE_SOURCE_DEFS[def.source];
  const known = new Map(source.fields.map((f) => [f.key, f]));
  const columns = def.fields.flatMap((k) => known.get(k) ?? []);
  const sortKeys = [...def.groupBy, def.sortBy ?? columns[0]?.key ?? ''];
  const items = source
    .rows(m, def)
    .map((r) => rounded(r, source.fields))
    .sort((a, b) => sortKeys.reduce((c, k) => c || cmp(a[k], b[k]), 0));
  const rows: ScheduleTableRow[] = [];
  const groups = groupsOf(items, def.groupBy);
  for (const g of groups) {
    if (!def.itemize) {
      rows.push({ kind: 'item', cells: aggregate(g, columns, true) });
      continue;
    }
    if (def.groupBy.length) {
      const label = def.groupBy.map((k) => String(g[0]?.[k] ?? '')).join(' · ');
      rows.push({ kind: 'group', cells: {}, label });
    }
    rows.push(...g.map((r) => ({ kind: 'item' as const, cells: only(r, columns) })));
    if (def.groupBy.length && columns.some((c) => c.sum))
      rows.push({ kind: 'subtotal', cells: aggregate(g, columns, false), label: 'Mezisoučet' });
  }
  if (items.length && columns.some((c) => c.sum))
    rows.push({ kind: 'total', cells: aggregate(items, columns, false), label: 'Celkem' });
  return { id: def.id, name: def.name, columns, rows };
}
