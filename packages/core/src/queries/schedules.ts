// Dotazy pro AI na výkazy (plán stěn Z8): seznam definic, dostupná pole zdrojů a spočítaná tabulka.
import { S } from '../commands/schema.ts';
import { fail } from '../commands/types.ts';
import { computeSchedule, SCHEDULE_SOURCE_DEFS, type ScheduleTable } from '../schedule/compute.ts';
import { scheduleToCsv } from '../schedule/csv.ts';
import type { ScheduleDef } from '../schedule/types.ts';
import { defineQuery } from './types.ts';

export const scheduleList = defineQuery<Record<string, never>, ScheduleDef[]>({
  name: 'schedule.list',
  label: 'Seznam výkazů',
  description:
    'Definice výkazů v projektu: id, název, zdroj, sloupce, seskupení, filtr a pravidlo odečtu otvorů.',
  group: 'Výkazy',
  params: S.object({}, []),
  run: (m) => Object.values(m.schedules),
});

export const scheduleFields = defineQuery<Record<string, never>, unknown>({
  name: 'schedule.fields',
  label: 'Pole výkazů',
  description:
    'Zdroje výkazů a jejich pole (klíč, název, jednotka, desetinná místa, zda se sčítá) – pro schedule.create.',
  group: 'Výkazy',
  params: S.object({}, []),
  run: () =>
    Object.entries(SCHEDULE_SOURCE_DEFS).map(([source, d]) => ({ source, label: d.label, fields: d.fields })),
});

export const scheduleTable = defineQuery<
  { scheduleId: string; format?: 'table' | 'csv' },
  ScheduleTable | string
>({
  name: 'schedule.table',
  label: 'Tabulka výkazu',
  description:
    'Spočítá výkaz z aktuálního modelu: sloupce a řádky (item = prvek nebo skupina se součty, group = ' +
    'záhlaví, subtotal = mezisoučet, total = celkem). Délky v m, plochy v m², objemy v m³, tloušťky v mm. ' +
    'format csv vrátí text CSV.',
  group: 'Výkazy',
  params: S.object({ scheduleId: S.id, format: S.enumOf(['table', 'csv'], 'tvar výsledku') }, ['scheduleId']),
  run(m, p) {
    const def = m.schedules[p.scheduleId] ?? fail('not-found', `Výkaz ${p.scheduleId} neexistuje.`);
    const t = computeSchedule(m, def);
    return p.format === 'csv' ? scheduleToCsv(t) : t;
  },
});
