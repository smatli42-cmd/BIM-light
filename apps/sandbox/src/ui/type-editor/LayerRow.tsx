// Řádek vrstvy v okně Editor typů (vzor Arditu „Skladby“): vzorek šrafy, materiál, tloušťka, funkce,
// přeřazení a smazání; u stěn prodloužení vrstvy rozbalením. Mění typ jen příkazy wallType.* nebo
// slabType.* (základ 6) – podle `kind`. Desky se ukazují shora dolů, v datech jsou vrstvy odspodu.
import { LAYER_FIELDS, materialFill, materialLines, type WallLayer } from '@bim-light/core';
import type { Session } from '../../session/session.ts';
import { HatchSwatch } from '../HatchSwatch.tsx';
import { SchemaForm } from '../SchemaForm.tsx';

const FUNCTIONS = [
  { value: 'core', label: 'jádro' },
  { value: 'insulation', label: 'izolace' },
  { value: 'finish', label: 'povrch' },
];
const EXTEND = Object.fromEntries(Object.entries(LAYER_FIELDS).filter(([k]) => k.startsWith('extend')));
const EXTEND_LABELS = { extendTop: 'Prodloužení nahoře', extendBottom: 'Prodloužení dole' };

function Choice(p: {
  k: string;
  title: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onPick: (key: string, value: string) => void;
}) {
  return (
    <select
      data-testid={`field-${p.k}`}
      title={p.title}
      value={p.value}
      onChange={(e) => p.onPick(p.k, e.currentTarget.value)}
    >
      {p.options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/** Druh typu: stěna (vrstvy od referenční strany) nebo deska (vrstvy odspodu, ukázané shora). */
export type LayerKind = 'wallType' | 'slabType';

const TITLES: Record<LayerKind, [string, string]> = {
  wallType: ['Posunout k referenční straně', 'Posunout ke straně tloušťky'],
  slabType: ['Posunout nahoru', 'Posunout dolů'],
};

/** Přeřazení a smazání vrstvy; `up` a `down` jsou cílové indexy v datech (null = nejde). */
function LayerTools(p: {
  run: (name: string, extra: object) => void;
  kind: LayerKind;
  i: number;
  count: number;
}) {
  const { run, kind, i, count } = p;
  const slab = kind === 'slabType';
  const up = slab ? i + 1 : i - 1;
  const down = slab ? i - 1 : i + 1;
  const ok = (j: number) => j >= 0 && j < count;
  const [upTitle, downTitle] = TITLES[kind];
  return (
    <span class="type-layer-tools">
      <button
        disabled={!ok(up)}
        title={upTitle}
        onClick={() => run(`${kind}.moveLayer`, { from: i, to: up })}
      >
        ↑
      </button>
      <button
        disabled={!ok(down)}
        title={downTitle}
        onClick={() => run(`${kind}.moveLayer`, { from: i, to: down })}
      >
        ↓
      </button>
      <button
        data-testid="layer-remove"
        disabled={count === 1}
        title="Smazat vrstvu"
        onClick={() => run(`${kind}.removeLayer`, { layerIndex: i })}
      >
        ×
      </button>
    </span>
  );
}

function Swatch({ s, materialId }: { s: Session; materialId: string }) {
  const m = s.model.materials[materialId];
  if (!m) return <span />;
  return (
    <HatchSwatch
      hatch={s.model.display.hatches[m.hatchId]}
      lines={materialLines(m)}
      fill={materialFill(m)}
      size={22}
    />
  );
}

/** Prodloužení vrstvy nahoru / dolů (jen stěny). */
function Extend(p: { layer: WallLayer; onChange: (key: string, value: unknown) => void }) {
  return (
    <details class="type-layer-more">
      <summary>Prodloužení vrstvy</summary>
      <SchemaForm
        fields={EXTEND}
        labels={EXTEND_LABELS}
        value={p.layer as unknown as Record<string, unknown>}
        onChange={p.onChange}
      />
    </details>
  );
}

interface RowProps {
  s: Session;
  kind: LayerKind;
  typeId: string;
  layer: WallLayer;
  i: number;
  count: number;
  selected: boolean;
  onSelect: (i: number) => void;
}

export function LayerRow(props: RowProps) {
  const { s, kind, layer, i, count } = props;
  const run = (name: string, extra: object) => s.run(name, { typeId: props.typeId, ...extra });
  const update = (key: string, value: unknown) => run(`${kind}.updateLayer`, { layerIndex: i, [key]: value });
  return (
    <div
      class={props.selected ? 'type-layer selected' : 'type-layer'}
      data-testid={`type-layer-${i}`}
      onFocusIn={() => props.onSelect(i)}
      onMouseDown={() => props.onSelect(i)}
    >
      <div class="type-layer-row">
        <Swatch s={s} materialId={layer.materialId} />
        <Choice
          k="materialId"
          title="Materiál"
          value={layer.materialId}
          options={Object.values(s.model.materials).map((x) => ({ value: x.id, label: x.name }))}
          onPick={update}
        />
        <input
          data-testid="field-thickness"
          type="number"
          min={1}
          title="Tloušťka (mm)"
          value={layer.thickness}
          onChange={(e) => update('thickness', Number(e.currentTarget.value))}
        />
        <Choice
          k="function"
          title="Funkce vrstvy"
          value={layer.function}
          options={FUNCTIONS}
          onPick={update}
        />
        <LayerTools run={run} kind={kind} i={i} count={count} />
      </div>
      {kind === 'wallType' && <Extend layer={layer} onChange={update} />}
    </div>
  );
}
