// Okno výkazu (plán stěn Z8, základ 8): tabulka spočítaná z modelu vlevo, nastavení vpravo,
// export CSV a smazání. Tabulka se přepočítá při každé změně modelu (nic se neukládá ručně).
import { computeSchedule, scheduleToCsv, SCHEDULE_SOURCE_DEFS } from '@bim-light/core';
import { browserPlatform } from '../../platform/browser.ts';
import type { Session } from '../../session/session.ts';
import { IconButton } from '../icons/Icon.tsx';
import { ScheduleSettings } from './ScheduleSettings.tsx';
import { ScheduleTable } from './ScheduleTable.tsx';

const fileName = (name: string) => `${name.replace(/[\\/:*?"<>|]+/g, '_').trim() || 'vykaz'}.csv`;

export function ScheduleDialog(p: { s: Session; scheduleId: string; onClose: () => void }) {
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
  const remove = () => {
    s.run('schedule.delete', { scheduleId: def.id });
    p.onClose();
  };
  return (
    <div class="dialog-back" onMouseDown={(e) => e.target === e.currentTarget && p.onClose()}>
      <div
        class="dialog schedule-dialog panel"
        role="dialog"
        aria-label={def.name}
        data-testid="schedule-dialog"
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Escape') p.onClose();
        }}
      >
        <div class="find-head">
          <strong data-testid="schedule-title">{def.name}</strong>
          <span class="muted">{SCHEDULE_SOURCE_DEFS[def.source].label}</span>
          <IconButton icon="close" label="Zavřít" onClick={p.onClose} />
        </div>
        <div class="schedule-body">
          <ScheduleTable t={table} />
          <ScheduleSettings s={s} def={def} />
        </div>
        <div class="dialog-actions">
          <button data-testid="schedule-delete" onClick={remove}>
            Smazat výkaz
          </button>
          <button data-testid="schedule-csv" onClick={exportCsv}>
            Exportovat CSV
          </button>
        </div>
      </div>
    </div>
  );
}
