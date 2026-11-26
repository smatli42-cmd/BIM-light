// Obsah → Projekt → Výkazy (koncepce rozhraní, část 4 „výpisy“; plán stěn Z8): seznam výkazů projektu,
// klik otevře okno výkazu, „+ Nový výkaz“ vytvoří výkaz ze zvoleného zdroje.
import { SCHEDULE_SOURCE_DEFS, SCHEDULE_SOURCES, type ScheduleSource } from '@bim-light/core';
import { useState } from 'preact/hooks';
import type { Session } from '../../session/session.ts';
import { Icon } from '../icons/Icon.tsx';
import { ScheduleDialog } from '../schedule/ScheduleDialog.tsx';

export function Schedules({ s }: { s: Session }) {
  const [open, setOpen] = useState<string | null>(null);
  const [source, setSource] = useState<ScheduleSource>('walls');
  const create = () => {
    const r = s.run('schedule.create', { name: 'Nový výkaz', source });
    if (r.ok && r.created[0]) setOpen(r.created[0]);
  };
  return (
    <>
      <div class="content-group">Výkazy</div>
      <ul class="content-list" data-testid="content-schedules">
        {Object.values(s.model.schedules).map((d) => (
          <li key={d.id}>
            <button data-testid={`open-schedule-${d.name}`} onClick={() => setOpen(d.id)}>
              <Icon name="table" size={16} />
              <span>{d.name}</span>
            </button>
          </li>
        ))}
      </ul>
      <div class="content-row">
        <select
          data-testid="schedule-source"
          value={source}
          onChange={(e) => setSource(e.currentTarget.value as ScheduleSource)}
        >
          {SCHEDULE_SOURCES.map((k) => (
            <option key={k} value={k}>
              {SCHEDULE_SOURCE_DEFS[k].label}
            </option>
          ))}
        </select>
        <button data-testid="schedule-new" onClick={create}>
          + Nový výkaz
        </button>
      </div>
      {open && <ScheduleDialog s={s} scheduleId={open} onClose={() => setOpen(null)} />}
    </>
  );
}
