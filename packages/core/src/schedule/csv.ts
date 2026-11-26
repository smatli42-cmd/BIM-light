// Tabulka výkazu jako CSV (středník, desetinná čárka – jak ho otevře český Excel). Zápis do souboru dělá
// aplikace přes Platform (základ 13).
import { formatCell } from './fields.ts';
import type { ScheduleTable } from './compute.ts';

const cell = (s: string) => (/[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

export function scheduleToCsv(t: ScheduleTable): string {
  const head = t.columns.map((c) => cell(c.unit ? `${c.label} (${c.unit})` : c.label));
  const lines = t.rows.map((r) =>
    t.columns
      .map((c, i) =>
        i === 0 && r.label && r.cells[c.key] === undefined ? r.label : formatCell(c, r.cells[c.key]),
      )
      .map(cell)
      .join(';'),
  );
  return [head.join(';'), ...lines].join('\r\n') + '\r\n';
}
