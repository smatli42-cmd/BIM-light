// Panel vlastností vpravo (pravidla-interakce: Výběr – typ, tloušťka a strana platí pro všechny
// vybrané stěny). Každá změna modelu jde přes příkaz jádra (základ 6).
import { bandThickness, parseNumber, type ReferenceLine, type Wall } from '@bim-light/core';
import type { Session } from '../session/session.ts';
import { useSession } from './use-session.ts';

function TypeSelect(props: {
  s: Session;
  value: string;
  mixed: boolean;
  testid: string;
  onPick: (id: string) => void;
}) {
  return (
    <label>
      Typ
      <select
        data-testid={props.testid}
        value={props.mixed ? '' : props.value}
        onChange={(e) => props.onPick(e.currentTarget.value)}
      >
        {props.mixed && <option value="">(různé)</option>}
        {Object.values(props.s.model.wallTypes).map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
    </label>
  );
}

const REF_LINES: readonly [ReferenceLine, string][] = [
  ['face', 'Líc'],
  ['axis', 'Osa'],
  ['core-face', 'Líc jádra'],
];

/** Referenční čára: zůstává na místě při změně tloušťky, stěna roste od ní (katalog kreslení 6.3). */
function RefLineSelect(props: {
  value: ReferenceLine | '';
  testid: string;
  onPick: (v: ReferenceLine) => void;
}) {
  return (
    <label title="Čára, která zůstane na místě při změně tloušťky; stěna se rozšíří od ní.">
      Referenční čára
      <select
        data-testid={props.testid}
        value={props.value}
        onChange={(e) => props.onPick(e.currentTarget.value as ReferenceLine)}
      >
        {props.value === '' && <option value="">(různé)</option>}
        {REF_LINES.map(([v, label]) => (
          <option key={v} value={v}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Check(props: { label: string; testid?: string; checked: boolean; onSet: (v: boolean) => void }) {
  return (
    <label class="check">
      <input
        type="checkbox"
        data-testid={props.testid}
        checked={props.checked}
        onChange={(e) => props.onSet(e.currentTarget.checked)}
      />
      {props.label}
    </label>
  );
}

function WallSection({ s }: { s: Session }) {
  const walls = s.selection.walls.map((id) => s.model.elements[id]).filter((w): w is Wall => !!w);
  const first = walls[0];
  if (!first) return null;
  const band = s.model.wallTypes[first.typeId]?.bands[0];
  const ids = walls.map((w) => w.id);
  const mixed = !walls.every((w) => w.typeId === first.typeId);
  const setThickness = (text: string) => {
    const t = parseNumber(text);
    if (t > 0) for (const id of ids) s.run('wall.setThickness', { wallId: id, thickness: t });
  };
  return (
    <section>
      <h2>Vybrané stěny ({walls.length})</h2>
      <TypeSelect
        s={s}
        value={first.typeId}
        mixed={mixed}
        testid="sel-type"
        onPick={(typeId) => s.run('wall.setType', { wallIds: ids, typeId })}
      />
      <label>
        Tloušťka
        <input
          data-testid="sel-thickness"
          key={`${first.id}-${first.typeId}`}
          defaultValue={band ? String(bandThickness(band)) : ''}
          onKeyDown={(e) => e.key === 'Enter' && setThickness(e.currentTarget.value)}
        />
      </label>
      <RefLineSelect
        value={walls.every((w) => w.referenceLine === first.referenceLine) ? first.referenceLine : ''}
        testid="sel-refline"
        onPick={(v) => {
          for (const id of ids) s.run('wall.setReferenceLine', { wallId: id, referenceLine: v });
        }}
      />
      <button data-testid="sel-flip" onClick={() => s.run('wall.flipSide', { wallIds: ids })}>
        Přehodit stranu <kbd>Mezerník</kbd>
      </button>
      <Check
        label="Dočasné kóty k osám"
        checked={s.tempMode === 'axis'}
        onSet={(v) => ((s.tempMode = v ? 'axis' : 'face'), s.changed())}
      />
    </section>
  );
}

function NewWallSection({ s }: { s: Session }) {
  return (
    <section>
      <h2>Nová stěna</h2>
      <TypeSelect
        s={s}
        value={s.wallTypeId}
        mixed={false}
        testid="new-type"
        onPick={(id) => ((s.wallTypeId = id), s.changed())}
      />
      <RefLineSelect
        value={s.wallRefLine}
        testid="new-refline"
        onPick={(v) => ((s.wallRefLine = v), s.changed())}
      />
      <p class="muted" data-testid="new-side">
        Tloušťka {s.wallSide === 'left' ? 'vlevo' : 'vpravo'} od směru kreslení (mezerník přehodí)
      </p>
    </section>
  );
}

function OptionsSection({ s }: { s: Session }) {
  const set = (fn: () => void) => (fn(), s.changed());
  return (
    <section>
      <h2>Volby</h2>
      <Check
        label="Vybírat stěny"
        testid="filter-walls"
        checked={s.filter.walls}
        onSet={(v) => set(() => (s.filter = { ...s.filter, walls: v }))}
      />
      <Check
        label="Vybírat kóty"
        testid="filter-dims"
        checked={s.filter.dimensions}
        onSet={(v) => set(() => (s.filter = { ...s.filter, dimensions: v }))}
      />
      <Check
        label="Otočit kopii"
        testid="opt-copy"
        checked={s.options.copy}
        onSet={(v) => set(() => (s.options.copy = v))}
      />
      <label>
        Pole – počet
        <input
          data-testid="opt-array-count"
          type="number"
          min={2}
          value={s.options.arrayCount}
          onChange={(e) => set(() => (s.options.arrayCount = Number(e.currentTarget.value) || 2))}
        />
      </label>
      <Check
        label="Radiální pole"
        testid="opt-radial"
        checked={s.options.arrayRadial}
        onSet={(v) => set(() => (s.options.arrayRadial = v))}
      />
    </section>
  );
}

export function PropertiesPanel({ session }: { session: Session }) {
  useSession(session);
  const s = session;
  const dims = s.selection.dims.length;
  return (
    <aside class="panel" data-testid="panel">
      <WallSection s={s} />
      {dims > 0 && (
        <section>
          <h2 data-testid="sel-dims">Vybrané kóty ({dims})</h2>
          <button onClick={() => s.run('selection.delete', { dimensionIds: s.selection.dims })}>
            Smazat <kbd>Del</kbd>
          </button>
        </section>
      )}
      <NewWallSection s={s} />
      <OptionsSection s={s} />
    </aside>
  );
}
