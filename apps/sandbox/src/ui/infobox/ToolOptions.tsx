// Volby nástrojů v info boxu (koncepce rozhraní, část 2 D): metoda výběru a mřížka u nástroje Výběr,
// kopie a pole u příkazů nad výběrem.
import type { Session } from '../../session/session.ts';
import { Section } from './Section.tsx';

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

/** Nástroj Výběr bez výběru: co jde vybírat, mřížka. */
export function SelectOptions({ s }: { s: Session }) {
  const set = (fn: () => void) => (fn(), s.changed());
  return (
    <Section title="Metoda výběru" info="Co jde vybrat klikem a rámečkem.">
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
      <GridOption s={s} />
    </Section>
  );
}

/** Příkazy nad výběrem: kopie, počet a druh pole. */
export function CommandOptions({ s }: { s: Session }) {
  const set = (fn: () => void) => (fn(), s.changed());
  return (
    <Section title="Volby příkazu">
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
          onInput={(e) => set(() => (s.options.arrayCount = Number(e.currentTarget.value) || 2))}
        />
      </label>
      <Check
        label="Radiální pole"
        testid="opt-radial"
        checked={s.options.arrayRadial}
        onSet={(v) => set(() => (s.options.arrayRadial = v))}
      />
    </Section>
  );
}
