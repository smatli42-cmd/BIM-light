// Panel vlastností vpravo (pravidla-interakce: Výběr – typ, tloušťka a strana platí pro všechny
// vybrané stěny). Každá změna modelu jde přes příkaz jádra (základ 6).
import { bandThickness, parseNumber, typeHasCore, type Wall } from '@bim-light/core';
import type { Session } from '../session/session.ts';
import { LayerMaterials } from './LayerMaterials.tsx';
import { WallHeightFields } from './WallHeightFields.tsx';
import { RefLineSelect, TypeSelect } from './WallFields.tsx';
import { useSession } from './use-session.ts';

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

const allHaveCore = (s: Session, walls: Wall[]) =>
  walls.every((w) => {
    const t = s.model.wallTypes[w.typeId];
    return !!t && typeHasCore(t);
  });

function WallActions({ s, ids }: { s: Session; ids: string[] }) {
  return (
    <>
      <button data-testid="sel-flip" onClick={() => s.run('wall.flipSide', { wallIds: ids })}>
        Přehodit stranu <kbd>Mezerník</kbd>
      </button>
      <Check
        label="Dočasné kóty k osám"
        checked={s.tempMode === 'axis'}
        onSet={(v) => ((s.tempMode = v ? 'axis' : 'face'), s.changed())}
      />
    </>
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
        coreAllowed={allHaveCore(s, walls)}
        onPick={(v) => {
          for (const id of ids) s.run('wall.setReferenceLine', { wallId: id, referenceLine: v });
        }}
      />
      <WallHeightFields s={s} walls={walls} />
      {walls.length === 1 && <LayerMaterials s={s} wall={first} />}
      <WallActions s={s} ids={ids} />
    </section>
  );
}

function NewWallSection({ s }: { s: Session }) {
  const newType = s.model.wallTypes[s.wallTypeId];
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
        coreAllowed={!!newType && typeHasCore(newType)}
        onPick={(v) => ((s.wallRefLine = v), s.changed())}
      />
      <p class="muted" data-testid="new-side">
        Tloušťka {s.wallSide === 'left' ? 'vlevo' : 'vpravo'} od směru kreslení (mezerník přehodí)
      </p>
    </section>
  );
}

/** Naposledy zvolená rozteč mřížky (po vypnutí a zapnutí se vrátí). */
let gridStep = 100;

/** Mřížka: zapnutí a rozteč (katalog kreslení 2.6). */
function GridOption({ s }: { s: Session }) {
  const set = (fn: () => void) => (fn(), s.changed());
  return (
    <>
      <Check
        label="Mřížka"
        testid="opt-grid"
        checked={s.options.grid > 0}
        onSet={(v) => set(() => (s.options.grid = v ? gridStep : 0))}
      />
      {s.options.grid > 0 && (
        <label>
          Rozteč mřížky (mm)
          <input
            data-testid="opt-grid-step"
            type="number"
            min={10}
            step={10}
            value={s.options.grid}
            onChange={(e) => set(() => (s.options.grid = gridStep = Number(e.currentTarget.value) || 100))}
          />
        </label>
      )}
    </>
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
      <GridOption s={s} />
    </section>
  );
}

export function PropertiesPanel({ session }: { session: Session }) {
  useSession(session);
  const s = session;
  const dims = s.selection.dims.length;
  return (
    <>
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
    </>
  );
}
