// Řádek vrstvy v okně Editor typů (vzor Arditu „Skladby“): vzorek šrafy, materiál, tloušťka, funkce,
// přeřazení a smazání; prodloužení vrstvy rozbalením. Mění typ jen příkazy wallType.* (základ 6).
import { LAYER_FIELDS, materialFill, materialLines, type WallLayer, type WallType } from '@bim-light/core';
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

/** Přeřazení a smazání vrstvy. */
function LayerTools(p: { run: (name: string, extra: object) => void; i: number; count: number }) {
  const { run, i, count } = p;
  return (
    <span class="type-layer-tools">
      <button
        disabled={i === 0}
        title="Posunout k referenční straně"
        onClick={() => run('wallType.moveLayer', { from: i, to: i - 1 })}
      >
        ↑
      </button>
      <button
        disabled={i === count - 1}
        title="Posunout ke straně tloušťky"
        onClick={() => run('wallType.moveLayer', { from: i, to: i + 1 })}
      >
        ↓
      </button>
      <button
        data-testid="layer-remove"
        disabled={count === 1}
        title="Smazat vrstvu"
        onClick={() => run('wallType.removeLayer', { layerIndex: i })}
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

interface RowProps {
  s: Session;
  type: WallType;
  layer: WallLayer;
  i: number;
  count: number;
  selected: boolean;
  onSelect: (i: number) => void;
}

export function LayerRow(props: RowProps) {
  const { s, type, layer, i, count } = props;
  const run = (name: string, extra: object) => s.run(name, { typeId: type.id, ...extra });
  const update = (key: string, value: unknown) =>
    run('wallType.updateLayer', { layerIndex: i, [key]: value });
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
        <LayerTools run={run} i={i} count={count} />
      </div>
      <details class="type-layer-more">
        <summary>Prodloužení vrstvy</summary>
        <SchemaForm
          fields={EXTEND}
          labels={EXTEND_LABELS}
          value={layer as unknown as Record<string, unknown>}
          onChange={update}
        />
      </details>
    </div>
  );
}
