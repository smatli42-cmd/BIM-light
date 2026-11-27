// Info box místnosti – zadávané údaje (prvky stavby 9; Archicad Zone Category, Revit vlastnosti místnosti):
// kategorie (funkce) s barvou, vlastní barva výplně (přepis prvku), výška podlahy, povrchy jako text,
// poznámka, počet osob a výpočtová teplota. Vše jde příkazem room.update (i pro AI).
import { parseNumber, type Room } from '@bim-light/core';
import type { Session } from '../../session/session.ts';
import { NumberInput } from '../NumberInput.tsx';
import { Section } from './Section.tsx';

/** Textové pole: Enter nebo opuštění pole uloží (prázdné = smazat údaj). */
export function TextField(p: { label: string; testid: string; value: string; onSet: (v: string) => void }) {
  return (
    <label>
      {p.label}
      <input
        data-testid={p.testid}
        key={p.value}
        defaultValue={p.value}
        onKeyDown={(e) => e.key === 'Enter' && p.onSet(e.currentTarget.value)}
        onBlur={(e) => e.currentTarget.value !== p.value && p.onSet(e.currentTarget.value)}
      />
    </label>
  );
}

const TEXTS: readonly ['floorFinish' | 'wallFinish' | 'ceilingFinish' | 'note', string][] = [
  ['floorFinish', 'Podlaha (druh)'],
  ['wallFinish', 'Stěny (povrch)'],
  ['ceilingFinish', 'Strop (povrch)'],
  ['note', 'Poznámka'],
];
const NUMBERS: readonly ['occupants' | 'temperature', string][] = [
  ['occupants', 'Počet osob'],
  ['temperature', 'Výpočtová teplota (°C)'],
];

/** Kategorie a barva výplně. */
function Look({ s, r, set }: { s: Session; r: Room; set: (p: Record<string, unknown>) => void }) {
  const cat = s.model.roomCategories[r.categoryId ?? ''];
  const own = r.graphicOverride?.fillColor;
  return (
    <>
      <label>
        Kategorie (funkce)
        <select
          data-testid="room-category"
          value={r.categoryId ?? ''}
          onChange={(e) => set({ categoryId: e.currentTarget.value || null })}
        >
          <option value="">bez kategorie</option>
          {Object.values(s.model.roomCategories).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.areaKind === 'living' ? 'obytná' : 'užitková'})
            </option>
          ))}
        </select>
      </label>
      <div class="ib-row">
        <span class="muted">Barva výplně</span>
        <input
          type="color"
          data-testid="room-color"
          value={own ?? cat?.color ?? '#ffffff'}
          onChange={(e) => set({ color: e.currentTarget.value })}
        />
        {own && (
          <button data-testid="room-color-reset" onClick={() => set({ color: null })}>
            {cat ? 'Barva kategorie' : 'Bez barvy'}
          </button>
        )}
      </div>
    </>
  );
}

export function RoomFields({ s, r }: { s: Session; r: Room }) {
  const set = (p: Record<string, unknown>) => s.run('room.update', { roomId: r.id, ...p });
  const p = r.props ?? {};
  const num = (v: string) => (v.trim() ? parseNumber(v) : null);
  return (
    <Section
      title="Vlastnosti místnosti"
      info="Údaje, které program nespočítá; ukáže je razítko a výpis místností."
    >
      <Look s={s} r={r} set={set} />
      <label>
        Výška podlahy nad podlažím (mm)
        <NumberInput testid="room-floor" value={r.floorOffset ?? 0} onSet={(v) => set({ floorOffset: v })} />
      </label>
      {TEXTS.map(([k, label]) => (
        <TextField
          key={k}
          label={label}
          testid={`room-${k}`}
          value={p[k] ?? ''}
          onSet={(v) => set({ [k]: v.trim() || null })}
        />
      ))}
      {NUMBERS.map(([k, label]) => (
        <TextField
          key={k}
          label={label}
          testid={`room-${k}`}
          value={p[k] === undefined ? '' : String(p[k])}
          onSet={(v) => {
            const n = num(v);
            if (n === null || Number.isFinite(n))
              set({ [k]: k === 'occupants' && n !== null ? Math.round(n) : n });
          }}
        />
      ))}
    </Section>
  );
}
