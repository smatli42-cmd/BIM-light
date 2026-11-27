// Info box místnosti (prvky stavby 9; podle principu Arditu, koncepce rozhraní 2 D): nástroj Místnost =
// stav nových místností a nápověda; vybraná místnost = číslo a název (úprava Enterem), plocha podle
// ČSN 73 4301, obvod, výška a objem jen ke čtení (počítají se ze stěn), kontrola, započítané výklenky;
// zadávané údaje (RoomFields) a obsah razítka stylu (RoomStamp).
import { roomInfo, type Room } from '@bim-light/core';
import type { Session } from '../../session/session.ts';
import { NumberInput } from '../NumberInput.tsx';
import { NewStatusField } from './NewStatus.tsx';
import { RoomFields, TextField } from './RoomFields.tsx';
import { RoomStampSection } from './RoomStamp.tsx';
import { Section } from './Section.tsx';

const dec = (v: number, d: number) => v.toFixed(d).replace('.', ',');
const STATE: Record<string, string> = {
  'not-enclosed': 'Místnost není uzavřená – doplňte stěnu nebo ji smažte.',
  'in-wall': 'Bod místnosti leží ve stěně.',
  redundant: 'Nadbytečná – ve stejném prostoru je už jiná místnost.',
};

function Row({ label, value, testid }: { label: string; value: string; testid?: string }) {
  return (
    <div class="ib-row">
      <span class="muted">{label}</span>
      <strong data-testid={testid}>{value}</strong>
    </div>
  );
}

/** Nástroj Místnost: stav nových místností (fáze). */
export function NewRoomInfo({ s }: { s: Session }) {
  return (
    <Section
      title="Místnost"
      info="Klik dovnitř prostoru mezi stěnami vloží místnost. Obrys se počítá z vnitřních líců stěn včetně omítek a přepočítá se při každé změně stěn."
    >
      <NewStatusField s={s} />
    </Section>
  );
}

/** Nástroj Místnost: stav nových místností a obsah razítka stylu. */
export function NewRoomPanel({ s }: { s: Session }) {
  return (
    <>
      <NewRoomInfo s={s} />
      <RoomStampSection s={s} />
    </>
  );
}

function OneRoom({ s, r }: { s: Session; r: Room }) {
  const g = roomInfo(s.model, r);
  const set = (p: Record<string, unknown>) => s.run('room.update', { roomId: r.id, ...p });
  const top = r.top.kind === 'height' ? r.top.value : Math.round(g.height);
  return (
    <>
      <TextField label="Číslo" testid="room-number" value={r.number} onSet={(v) => set({ number: v })} />
      <TextField label="Název" testid="room-name" value={r.name} onSet={(v) => set({ name: v })} />
      {STATE[g.state] && (
        <p class="bad" data-testid="room-warning">
          {STATE[g.state]}
        </p>
      )}
      <Section
        title="Plocha (ČSN 73 4301)"
        info="Jen ke čtení: počítá se z líců stěn, bez sloupů a komínů, s výklenky od 0,30 m."
      >
        <Row label="Plocha" value={`${dec(g.area / 1e6, 2)} m²`} testid="room-area" />
        <Row label="Obvod" value={`${dec(g.perimeter / 1000, 2)} m`} />
        <Row label="Objem" value={`${dec(g.volume / 1e9, 2)} m³`} />
        {g.niches.length > 0 && <Row label="Započítané výklenky" value={String(g.niches.length)} />}
      </Section>
      <label>
        Výška místnosti (mm)
        <NumberInput
          testid="room-height"
          value={top}
          onSet={(v) => set({ top: { kind: 'height', value: v } })}
        />
      </label>
      {r.stampAt && (
        <button data-testid="room-stamp-reset" onClick={() => set({ stampAt: null })}>
          Razítko zpět do místnosti
        </button>
      )}
      <RoomFields s={s} r={r} />
    </>
  );
}

/** Vybrané místnosti: jedna = úpravy, víc = počet a součet ploch. */
export function SelectedRoomsInfo({ s }: { s: Session }) {
  const rooms = s.selection.rooms.map((id) => s.model.rooms[id]).filter((r): r is Room => !!r);
  if (!rooms.length) return null;
  const total = rooms.reduce((a, r) => a + roomInfo(s.model, r).area, 0);
  const one = rooms.length === 1 ? rooms[0] : undefined;
  return (
    <section data-testid="sel-rooms">
      <h2>{one ? 'Místnost' : `Vybrané místnosti (${rooms.length})`}</h2>
      {one ? (
        <OneRoom key={one.id} s={s} r={one} />
      ) : (
        <Row label="Plocha celkem" value={`${dec(total / 1e6, 2)} m²`} />
      )}
      <button
        data-testid="room-delete"
        onClick={() => s.run('room.delete', { roomIds: rooms.map((r) => r.id) })}
      >
        Smazat <kbd>Del</kbd>
      </button>
      <RoomStampSection s={s} />
    </section>
  );
}
