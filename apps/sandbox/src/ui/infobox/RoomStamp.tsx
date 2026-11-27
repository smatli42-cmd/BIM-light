// Obsah razítka místnosti (základy 27, 31): které údaje razítko ukazuje a v jakém pořadí. Je to data stylu
// pohledu, platí pro všechna razítka v pohledech se stylem a přenáší se s nastavením zobrazení.
// Zapnuté údaje jsou nahoře v pořadí razítka (šipky je posunou), vypnuté pod nimi.
import { ROOM_STAMP_FIELDS, ROOM_STAMP_LABELS, stampFields, type RoomStampField } from '@bim-light/core';
import type { Session } from '../../session/session.ts';
import { Section } from './Section.tsx';

interface RowProps {
  f: RoomStampField;
  /** Pořadí v razítku; −1 = vypnutý údaj. */
  i: number;
  last: number;
  on: RoomStampField[];
  save: (fields: RoomStampField[]) => void;
  move: (i: number, d: number) => void;
}

function StampRow({ f, i, last, on, save, move }: RowProps) {
  return (
    <div class="ib-row" data-testid={`stamp-${f}`}>
      <label class="check">
        <input
          type="checkbox"
          data-testid={`stamp-on-${f}`}
          checked={i >= 0}
          onChange={(e) => save(e.currentTarget.checked ? [...on, f] : on.filter((x) => x !== f))}
        />
        {ROOM_STAMP_LABELS[f]}
      </label>
      {i >= 0 && (
        <span>
          <button
            aria-label="Výš"
            data-testid={`stamp-up-${f}`}
            disabled={i === 0}
            onClick={() => move(i, -1)}
          >
            ↑
          </button>
          <button
            aria-label="Níž"
            data-testid={`stamp-down-${f}`}
            disabled={i === last}
            onClick={() => move(i, 1)}
          >
            ↓
          </button>
        </span>
      )}
    </div>
  );
}

export function RoomStampSection({ s }: { s: Session }) {
  const style = s.model.display.styles[s.view.styleId];
  if (!style) return null;
  const on = stampFields(style);
  const off = ROOM_STAMP_FIELDS.filter((f) => !on.includes(f));
  const save = (fields: RoomStampField[]) => s.run('style.setRoomStamp', { styleId: style.id, fields });
  const move = (i: number, d: number) => {
    const next = [...on];
    const [f] = next.splice(i, 1);
    if (f) next.splice(Math.max(0, Math.min(next.length, i + d)), 0, f);
    save(next);
  };
  return (
    <Section
      title={`Razítko místnosti – styl ${style.name}`}
      info="Co ukazují všechna razítka v pohledech s tímto stylem a v jakém pořadí. Přenáší se s nastavením zobrazení."
    >
      {on.map((f, i) => (
        <StampRow key={f} f={f} i={i} last={on.length - 1} on={on} save={save} move={move} />
      ))}
      {off.map((f) => (
        <StampRow key={f} f={f} i={-1} last={0} on={on} save={save} move={move} />
      ))}
    </Section>
  );
}
