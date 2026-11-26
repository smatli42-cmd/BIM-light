// Stav nových prvků (fáze, jako paleta Rekonstrukce v Archicadu; pokyn uživatele 2026-11-26): nejdřív
// „Stávající“ a kreslí se zaměření, pak „Nový“ a kreslí se návrh. Platí pro stěny i otvory; je to volba
// nástroje (ne data modelu), nový prvek ji dostane do svého příkazu.
import type { Status } from '@bim-light/core';
import type { Session } from '../../session/session.ts';

export const STATUS_LABELS: [Status, string][] = [
  ['existing', 'Stávající'],
  ['demolished', 'Bourání'],
  ['new', 'Nový'],
];

export function NewStatusField({ s }: { s: Session }) {
  return (
    <label>
      Stav nových prvků (fáze)
      <select
        data-testid="new-status"
        value={s.options.newStatus}
        onChange={(e) => {
          s.options.newStatus = e.currentTarget.value as Status;
          s.changed();
        }}
      >
        {STATUS_LABELS.map(([v, label]) => (
          <option key={v} value={v}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
