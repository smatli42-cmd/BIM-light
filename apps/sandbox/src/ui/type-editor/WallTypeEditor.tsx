// Skladba typu stěny v okně Editor typů (plán stěn Z1, rozhodnutí 5; vzor Arditu „Skladby“): název,
// vrstvy jako řádky materiál – tloušťka – funkce, „+ vrstva“, součet, použití, duplikovat a smazat.
// Vše přes příkazy jádra (wallType.*), stejně jako AI.
import {
  bandThickness,
  LAYER_FIELDS,
  materialFill,
  materialLines,
  wallTypeUsage,
  type WallLayer,
  type WallType,
} from '@bim-light/core';
import { useState } from 'preact/hooks';
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

function LayerRow(props: { s: Session; type: WallType; layer: WallLayer; i: number; count: number }) {
  const { s, type, layer, i, count } = props;
  const run = (name: string, extra: object) => s.run(name, { typeId: type.id, ...extra });
  const update = (key: string, value: unknown) =>
    run('wallType.updateLayer', { layerIndex: i, [key]: value });
  return (
    <div class="type-layer" data-testid={`type-layer-${i}`}>
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

function select(s: Session, id: string | null) {
  s.typeEditor = id;
  s.changed();
}

/** Použití, Duplikovat, Smazat (použitý typ jen s náhradou). */
function TypeActions({ s, type }: { s: Session; type: WallType }) {
  const used = wallTypeUsage(s.model, type.id);
  const others = Object.values(s.model.wallTypes).filter((t) => t.id !== type.id);
  const [replacement, setReplacement] = useState(others[0]?.id ?? '');
  const duplicate = () => {
    const r = s.run('wallType.duplicate', { typeId: type.id });
    if (r.ok && r.created[0]) select(s, r.created[0]);
  };
  const remove = () => {
    const r = s.run('wallType.delete', {
      typeId: type.id,
      ...(used > 0 ? { replacementId: replacement } : {}),
    });
    if (r.ok) select(s, used > 0 ? replacement : (others[0]?.id ?? null));
  };
  return (
    <div class="type-actions">
      <p class="muted" data-testid="type-usage">
        Použití: {used} stěn
      </p>
      {used > 0 && (
        <label>
          Náhrada při smazání
          <select value={replacement} onChange={(e) => setReplacement(e.currentTarget.value)}>
            {others.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <span class="row">
        <button data-testid="type-duplicate" onClick={duplicate}>
          Duplikovat
        </button>
        <button data-testid="type-delete" onClick={remove}>
          Smazat
        </button>
      </span>
    </div>
  );
}

export function WallTypeEditor({ s, type }: { s: Session; type: WallType }) {
  const band = type.bands[0];
  if (!band) return null;
  const firstMaterial = band.layers[band.layers.length - 1]?.materialId ?? '';
  return (
    <div class="type-editor" data-testid="type-editor">
      <label class="type-name">
        <input
          data-testid="type-name"
          key={type.name}
          defaultValue={type.name}
          onChange={(e) => s.run('wallType.rename', { typeId: type.id, name: e.currentTarget.value })}
        />
        <span data-testid="type-total">{bandThickness(band)} mm</span>
      </label>
      <p class="muted">Vrstvy od referenční (vnitřní) strany ke straně tloušťky:</p>
      <div class="type-layer-head muted">
        <span />
        <span>Materiál</span>
        <span>mm</span>
        <span>Funkce</span>
        <span />
      </div>
      {band.layers.map((l, i) => (
        <LayerRow key={i} s={s} type={type} layer={l} i={i} count={band.layers.length} />
      ))}
      <button
        data-testid="layer-add"
        onClick={() =>
          s.run('wallType.addLayer', {
            typeId: type.id,
            layer: { materialId: firstMaterial, thickness: 10, function: 'finish' },
          })
        }
      >
        + vrstva
      </button>
      <TypeActions s={s} type={type} />
    </div>
  );
}
