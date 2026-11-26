// Tabulka výkazu (plán stěn Z8): jen zobrazí, co spočítalo jádro (computeSchedule); nic nepočítá samo.
import { formatCell, type ScheduleTable as Table } from '@bim-light/core';

export function ScheduleTable({ t }: { t: Table }) {
  if (!t.rows.length) return <p class="muted">Výkaz je prázdný – v modelu nejsou prvky podle filtru.</p>;
  return (
    <div class="schedule-scroll">
      <table class="schedule-table" data-testid="schedule-table">
        <thead>
          <tr>
            {t.columns.map((c) => (
              <th key={c.key} class={c.unit ? 'num' : ''}>
                {c.label}
                {c.unit && <span class="unit"> [{c.unit}]</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {t.rows.map((r, i) =>
            r.kind === 'group' ? (
              <tr key={i} class="group">
                <td colSpan={t.columns.length}>{r.label}</td>
              </tr>
            ) : (
              <tr key={i} class={r.kind} data-testid={`schedule-row-${r.kind}`}>
                {t.columns.map((c, ci) => {
                  const v = r.cells[c.key];
                  const label = ci === 0 && v === undefined ? (r.label ?? '') : formatCell(c, v);
                  return (
                    <td key={c.key} class={typeof v === 'number' ? 'num' : ''}>
                      {label}
                    </td>
                  );
                })}
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}
