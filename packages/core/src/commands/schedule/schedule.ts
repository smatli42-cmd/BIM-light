// Příkazy výkazů (základ 8, plán stěn Z8): vytvoř, uprav, smaž definici výkazu. Obsah tabulky se
// nikdy neukládá – počítá se z modelu (dotaz schedule.table).
import type { Id } from '../../ids/index.ts';
import type { Model } from '../../model/types.ts';
import { STATUSES } from '../../model/types.ts';
import { SCHEDULE_SOURCE_DEFS } from '../../schedule/compute.ts';
import {
  DEFAULT_FILTER,
  SCHEDULE_SOURCES,
  type ScheduleDef,
  type ScheduleFilter,
  type ScheduleSource,
} from '../../schedule/types.ts';
import { S, type JsonSchema } from '../schema.ts';
import { defineCommand, fail } from '../types.ts';

const GROUP = 'Výkazy';
const KEYS: JsonSchema = {
  type: 'array',
  items: { type: 'string' },
  description: 'klíče polí (schedule.fields)',
};
const FILTER: JsonSchema = S.object(
  {
    storeyIds: { type: 'array', items: S.id, description: 'jen tato podlaží (prázdné = všechna)' },
    statuses: { type: 'array', items: S.enumOf(STATUSES, 'stav'), description: 'jen tyto stavy' },
    variants: S.enumOf(['main', 'all'], 'hlavní model, nebo i varianty'),
    onlyUsed: { type: 'boolean', description: 'legenda: jen použité typy' },
  },
  [],
);
const EDITABLE = {
  name: { type: 'string', description: 'název výkazu' },
  fields: KEYS,
  groupBy: KEYS,
  itemize: { type: 'boolean', description: 'každý prvek na řádku (false = jeden řádek za skupinu)' },
  sortBy: { oneOf: [{ type: 'string' }, { type: 'null' }], description: 'řazení ve skupině' },
  filter: FILTER,
  minOpeningArea: S.number('otvory do této plochy (m²) se z ploch neodečítají', { minimum: 0 }),
} as const satisfies Record<string, JsonSchema>;

type Editable = Partial<Omit<ScheduleDef, 'id' | 'source' | 'filter'>> & { filter?: Partial<ScheduleFilter> };

/** Kontrola definice: pole a seskupení musí zdroj znát; název nesmí být prázdný. */
function checked(model: Model, def: ScheduleDef): Model {
  const known = new Set(SCHEDULE_SOURCE_DEFS[def.source].fields.map((f) => f.key));
  const bad = [...def.fields, ...def.groupBy, ...(def.sortBy ? [def.sortBy] : [])].filter(
    (k) => !known.has(k),
  );
  if (bad.length) fail('invalid', `Zdroj ${def.source} nezná pole: ${bad.join(', ')}`);
  if (!def.fields.length) fail('invalid', 'Výkaz musí mít aspoň jeden sloupec');
  if (!def.name.trim()) fail('invalid', 'Název výkazu nesmí být prázdný');
  return { ...model, schedules: { ...model.schedules, [def.id]: def } };
}

const scheduleOf = (m: Model, id: Id) => m.schedules[id] ?? fail('not-found', `Výkaz ${id} neexistuje`);

export const scheduleCreate = defineCommand<Editable & { source: ScheduleSource; name: string }>({
  name: 'schedule.create',
  label: 'Nový výkaz',
  description:
    'Vytvoří výkaz (tabulku z modelu): zdroj walls (stěny) / wall-layers (vrstvy = materiály) / ' +
    'wall-types (legenda skladeb), sloupce, seskupení, řazení, filtr a pravidlo odečtu otvorů. ' +
    'Bez sloupců dostane všechna pole zdroje.',
  group: GROUP,
  params: S.object({ source: S.enumOf(SCHEDULE_SOURCES, 'zdroj řádků'), ...EDITABLE }, ['source', 'name']),
  run(model, p, ctx) {
    const def: ScheduleDef = {
      id: ctx.newId(),
      name: p.name.trim(),
      source: p.source,
      fields: p.fields ?? SCHEDULE_SOURCE_DEFS[p.source].fields.map((f) => f.key),
      groupBy: p.groupBy ?? [],
      itemize: p.itemize ?? true,
      sortBy: p.sortBy ?? null,
      filter: { ...DEFAULT_FILTER, ...p.filter },
      minOpeningArea: p.minOpeningArea ?? 0,
    };
    return { model: checked(model, def), created: [def.id] };
  },
});

export const scheduleUpdate = defineCommand<Editable & { scheduleId: Id }>({
  name: 'schedule.update',
  label: 'Upravit výkaz',
  description:
    'Změní definici výkazu (jen zadané): název, sloupce, seskupení, po prvcích / součty skupin, řazení, ' +
    'filtr (podlaží, stavy, varianty, jen použité typy) a mez odečtu otvorů (m²).',
  group: GROUP,
  params: S.object({ scheduleId: S.id, ...EDITABLE }, ['scheduleId']),
  run(model, { scheduleId, filter, ...rest }) {
    const old = scheduleOf(model, scheduleId);
    const def: ScheduleDef = { ...old, ...rest, filter: { ...old.filter, ...filter } };
    return { model: checked(model, def) };
  },
});

export const scheduleDelete = defineCommand<{ scheduleId: Id }>({
  name: 'schedule.delete',
  label: 'Smazat výkaz',
  description: 'Smaže definici výkazu (tabulku). Model ani prvky se nemění; jde vrátit přes Zpět.',
  group: GROUP,
  params: S.object({ scheduleId: S.id }, ['scheduleId']),
  run(model, p) {
    scheduleOf(model, p.scheduleId);
    const { [p.scheduleId]: _gone, ...schedules } = model.schedules;
    return { model: { ...model, schedules } };
  },
});
