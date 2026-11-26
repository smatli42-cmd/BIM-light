// Nastavení výkazu (plán stěn Z8): sloupce, seskupení, po prvcích, filtr stavu a odečet otvorů.
// Každá změna je příkaz schedule.update (jeden krok Zpět, stejně jako přes AI).
import {
  SCHEDULE_SOURCE_DEFS,
  STATUS_LABELS,
  STATUSES,
  type ScheduleDef,
  type Status,
} from '@bim-light/core';
import type { Session } from '../../session/session.ts';
import { NumberInput } from '../NumberInput.tsx';

type Update = (p: Record<string, unknown>) => void;

function StatusFilter({ def, update }: { def: ScheduleDef; update: Update }) {
  const toggle = (st: Status, on: boolean) =>
    update({
      filter: {
        statuses: on ? [...def.filter.statuses, st] : def.filter.statuses.filter((x) => x !== st),
      },
    });
  return (
    <fieldset>
      <legend>Stav (nic = vše)</legend>
      {STATUSES.map((st) => (
        <label key={st} class="check">
          <input
            type="checkbox"
            data-testid={`schedule-status-${st}`}
            checked={def.filter.statuses.includes(st)}
            onChange={(e) => toggle(st, e.currentTarget.checked)}
          />
          {STATUS_LABELS[st]}
        </label>
      ))}
    </fieldset>
  );
}

function Columns({ def, update }: { def: ScheduleDef; update: Update }) {
  const source = SCHEDULE_SOURCE_DEFS[def.source];
  const toggle = (key: string, on: boolean) => {
    const next = on ? [...def.fields, key] : def.fields.filter((k) => k !== key);
    // Pořadí sloupců podle popisu zdroje, ať nový sloupec nepřibude na náhodném místě.
    if (next.length) update({ fields: source.fields.map((f) => f.key).filter((k) => next.includes(k)) });
  };
  return (
    <fieldset>
      <legend>Sloupce</legend>
      {source.fields.map((f) => (
        <label key={f.key} class="check">
          <input
            type="checkbox"
            data-testid={`schedule-field-${f.key}`}
            checked={def.fields.includes(f.key)}
            onChange={(e) => toggle(f.key, e.currentTarget.checked)}
          />
          {f.label}
        </label>
      ))}
    </fieldset>
  );
}

/** Legenda: jen použité typy; ostatní zdroje: mez odečtu otvorů. */
function SourceRule({ def, update }: { def: ScheduleDef; update: Update }) {
  if (def.source === 'wall-types')
    return (
      <label class="check">
        <input
          type="checkbox"
          checked={def.filter.onlyUsed}
          onChange={(e) => update({ filter: { onlyUsed: e.currentTarget.checked } })}
        />
        Jen použité typy
      </label>
    );
  return (
    <label title="Rozpočtové zvyklosti se liší: menší otvory se z ploch neodečítají (objem vždy)">
      Neodečítat otvory do (m²)
      <NumberInput
        testid="schedule-min-opening"
        value={def.minOpeningArea}
        onSet={(v) => v >= 0 && update({ minOpeningArea: v })}
      />
    </label>
  );
}

export function ScheduleSettings({ s, def }: { s: Session; def: ScheduleDef }) {
  const update: Update = (p) => s.run('schedule.update', { scheduleId: def.id, ...p });
  const texts = SCHEDULE_SOURCE_DEFS[def.source].fields.filter((f) => !f.unit);
  return (
    <div class="schedule-settings" data-testid="schedule-settings">
      <label>
        Název
        <input
          data-testid="schedule-name"
          key={def.name}
          defaultValue={def.name}
          onKeyDown={(e) => e.key === 'Enter' && update({ name: e.currentTarget.value })}
        />
      </label>
      <label>
        Seskupit podle
        <select
          data-testid="schedule-group"
          value={def.groupBy[0] ?? ''}
          onChange={(e) => update({ groupBy: e.currentTarget.value ? [e.currentTarget.value] : [] })}
        >
          <option value="">bez seskupení</option>
          {texts.map((f) => (
            <option key={f.key} value={f.key}>
              {f.label}
            </option>
          ))}
        </select>
      </label>
      <label class="check">
        <input
          type="checkbox"
          data-testid="schedule-itemize"
          checked={def.itemize}
          onChange={(e) => update({ itemize: e.currentTarget.checked })}
        />
        Každý prvek na řádku
      </label>
      <StatusFilter def={def} update={update} />
      <SourceRule def={def} update={update} />
      <Columns def={def} update={update} />
    </div>
  );
}
