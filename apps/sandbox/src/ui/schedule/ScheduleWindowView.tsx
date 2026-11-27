// Výkaz / výpis v pracovním okně (záložka okna, pokyn uživatele 2026-11-27; dříve dialog; plán stěn Z8,
// základ 8): v záhlaví záložky okna a název, pod ním tabulka spočítaná z modelu vlevo, nastavení vpravo,
// export CSV a smazání. Tabulka se přepočítá při každé změně modelu (nic se neukládá ručně).
import { computeSchedule, scheduleToCsv, SCHEDULE_SOURCE_DEFS } from '@bim-light/core';
import { browserPlatform } from '../../platform/browser.ts';
import type { Session } from '../../session/session.ts';
import { activate } from '../../session/windows.ts';
import { Icon } from '../icons/Icon.tsx';
import { PlanWindowTabs } from '../layout/WindowTabs.tsx';
import { ScheduleSettings } from './ScheduleSettings.tsx';
import { ScheduleTable } from './ScheduleTable.tsx';

const fileName = (name: string) => `${name.replace(/[\\/:*?"<>|]+/g, '_').trim() || 'vykaz'}.csv`;

export function ScheduleWindowView(p: { s: Session; index: number; scheduleId: string; cls: string }) {
  const { s } = p;
  const def = s.model.schedules[p.scheduleId];
  if (!def) return null;
  const table = computeSchedule(s.model, def);
  const exportCsv = () => {
    const name = fileName(def.name);
    // BOM, aby Excel poznal UTF-8 (čeština).
    void browserPlatform
      .writeTextAtomic(name, '﻿' + scheduleToCsv(table))
      .then(() => s.toast(`Exportováno: ${name}`, 'ok'));
  };
  const active = p.index === s.active;
  return (
    <section
      class={p.cls}
      data-testid={active ? 'window' : 'window-passive'}
      onMouseDown={() => activate(s, p.index)}
    >
      <PlanWindowTabs s={s} index={p.index} />
      <div class="window-head">
        <span class="window-tab">
          <Icon name="table" size={16} />
          <strong data-testid="schedule-title">{def.name}</strong>
        </span>
        <span class="muted">{SCHEDULE_SOURCE_DEFS[def.source].label}</span>
        <span class="spacer" />
        <button data-testid="schedule-csv" onClick={exportCsv}>
          Exportovat CSV
        </button>
        <button
          data-testid="schedule-delete"
          onClick={() => s.run('schedule.delete', { scheduleId: def.id })}
        >
          Smazat výkaz
        </button>
      </div>
      <main class="workspace schedule-window" data-testid="schedule-dialog">
        <div class="schedule-body">
          <ScheduleTable t={table} />
          <ScheduleSettings s={s} def={def} />
        </div>
      </main>
    </section>
  );
}
