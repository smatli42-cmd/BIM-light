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
      <Check
        label="Vybírat desky"
        testid="filter-slabs"
        checked={s.filter.slabs}
        onSet={(v) => set(() => (s.filter = { ...s.filter, slabs: v }))}
      />
      <Check
        label="Vybírat místnosti"
        testid="filter-rooms"
        checked={s.filter.rooms}
        onSet={(v) => set(() => (s.filter = { ...s.filter, rooms: v }))}
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
      <label>
        Rozdělit – mezera (mm)
        <input
          data-testid="opt-split-gap"
          type="number"
          min={0}
          step={10}
          value={s.options.splitGap}
          onInput={(e) => set(() => (s.options.splitGap = Math.max(0, Number(e.currentTarget.value) || 0)))}
        />
      </label>
    </Section>
  );
}

type Opt<T> = { value: T; label: string; testid: string };

function Radios<T extends string>(p: { name: string; value: T; options: Opt<T>[]; onPick: (v: T) => void }) {
  return (
    <>
      {p.options.map((o) => (
        <label class="check" key={o.value}>
          <input
            type="radio"
            name={p.name}
            data-testid={o.testid}
            checked={p.value === o.value}
            onChange={() => p.onPick(o.value)}
          />
          {o.label}
        </label>
      ))}
    </>
  );
}

const PICK: Opt<'faces' | 'wall'>[] = [
  { value: 'faces', label: 'Líce a hrany (jednotlivě)', testid: 'dim-pick-faces' },
  { value: 'wall', label: 'Celou stěnu (řetěz)', testid: 'dim-pick-wall' },
];
const ARC: Opt<'radius' | 'diameter'>[] = [
  { value: 'radius', label: 'Poloměr (R)', testid: 'arc-dim-radius' },
  { value: 'diameter', label: 'Průměr (⌀)', testid: 'arc-dim-diameter' },
];

/** Nástroj Kóta: co se kótuje (Revit „Vybrat: jednotlivé reference / celé stěny“) a kóta oblouku. */
export function DimensionOptions({ s }: { s: Session }) {
  const set = (fn: () => void) => (fn(), s.changed());
  const o = s.options;
  return (
    <>
      <Section title="Co kótovat" info="Celou stěnu: klik na stěnu u líce, druhý klik položí řetěz.">
        <Radios name="dim-pick" value={o.dimPick} options={PICK} onPick={(v) => set(() => (o.dimPick = v))} />
        {o.dimPick === 'wall' && (
          <Check
            label="i šířky všech stěn (rohy, příčky)"
            testid="dim-walls"
            checked={o.dimWalls}
            onSet={(v) => set(() => (o.dimWalls = v))}
          />
        )}
      </Section>
      {o.dimPick === 'faces' && (
        <Section
          title="Kóta oblouku"
          info="Klik na líc obloukové stěny a pak do volného místa vloží tuto kótu."
        >
          <Radios name="arc-dim" value={o.arcDim} options={ARC} onPick={(v) => set(() => (o.arcDim = v))} />
        </Section>
      )}
    </>
  );
}
