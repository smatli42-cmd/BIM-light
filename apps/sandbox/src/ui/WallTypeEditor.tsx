// Editor typu stěny (plán stěn Z1, rozhodnutí 5): název, tabulka vrstev z popisu parametrů
// (základ 15b), živý náhled řezu, součet tloušťky, referenční čára. Vše přes příkazy jádra.
import {
  bandThickness,
  LAYER_FIELDS,
  materialFill,
  materialLines,
  typeHasCore,
  wallTypeUsage,
  type WallLayer,
  type WallType,
} from '@bim-light/core';
import { useState } from 'preact/hooks';
import type { Session } from '../session/session.ts';
import { HatchSwatch } from './HatchSwatch.tsx';
import { SchemaForm } from './SchemaForm.tsx';
import { TypePreview } from './TypePreview.tsx';
import { RefLineSelect } from './WallFields.tsx';

const LABELS: Record<string, string> = {
  materialId: 'Materiál',
  thickness: 'Tloušťka (mm)',
  function: 'Funkce',
  extendTop: 'Prodl. nahoře',
  extendBottom: 'Prodl. dole',
};
const FUNCTIONS = [
  { value: 'core', label: 'jádro' },
  { value: 'insulation', label: 'izolace' },
  { value: 'finish', label: 'povrch' },
];

function LayerRow(props: { s: Session; type: WallType; layer: WallLayer; i: number; count: number }) {
  const { s, type, layer, i, count } = props;
  const m = s.model.materials[layer.materialId];
  const mats = Object.values(s.model.materials).map((x) => ({ value: x.id, label: x.name }));
  const run = (name: string, extra: object) => s.run(name, { typeId: type.id, ...extra });
  return (
    <div class="type-layer" data-testid={`type-layer-${i}`}>
      <div class="type-layer-head">
        {m && (
          <HatchSwatch
            hatch={s.model.display.hatches[m.hatchId]}
            lines={materialLines(m)}
            fill={materialFill(m)}
            size={22}
          />
        )}
        <span>Vrstva {i + 1}</span>
        <button
          disabled={i === 0}
          title="nahoru"
          onClick={() => run('wallType.moveLayer', { from: i, to: i - 1 })}
        >
          ↑
        </button>
        <button
          disabled={i === count - 1}
          title="dolů"
          onClick={() => run('wallType.moveLayer', { from: i, to: i + 1 })}
        >
          ↓
        </button>
        <button
          data-testid="layer-remove"
          disabled={count === 1}
          title="smazat vrstvu"
          onClick={() => run('wallType.removeLayer', { layerIndex: i })}
        >
          ×
        </button>
      </div>
      <SchemaForm
        fields={LAYER_FIELDS}
        labels={LABELS}
        value={layer as unknown as Record<string, unknown>}
        options={{ materialId: mats, function: FUNCTIONS }}
        onChange={(key, value) => run('wallType.updateLayer', { layerIndex: i, [key]: value })}
      />
    </div>
  );
}

/** Použití, Duplikovat, Smazat (použitý typ jen s náhradou). */
function TypeActions({ s, type }: { s: Session; type: WallType }) {
  const used = wallTypeUsage(s.model, type.id);
  const others = Object.values(s.model.wallTypes).filter((t) => t.id !== type.id);
  const [replacement, setReplacement] = useState(others[0]?.id ?? '');
  return (
    <>
      <p class="muted" data-testid="type-usage">
        Použití: {used} stěn
      </p>
      <button data-testid="type-duplicate" onClick={() => s.run('wallType.duplicate', { typeId: type.id })}>
        Duplikovat
      </button>
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
      <button
        data-testid="type-delete"
        onClick={() =>
          s.run('wallType.delete', { typeId: type.id, ...(used > 0 ? { replacementId: replacement } : {}) })
        }
      >
        Smazat
      </button>
    </>
  );
}

export function WallTypeEditor({ s, type }: { s: Session; type: WallType }) {
  const band = type.bands[0];
  if (!band) return null;
  const hasCore = typeHasCore(type);
  const refLine = s.wallRefLine === 'core-face' && !hasCore ? 'face' : s.wallRefLine;
  const firstMaterial = band.layers[band.layers.length - 1]?.materialId ?? '';
  return (
    <div class="type-editor" data-testid="type-editor">
      <label>
        Název
        <input
          data-testid="type-name"
          key={type.name}
          defaultValue={type.name}
          onChange={(e) => s.run('wallType.rename', { typeId: type.id, name: e.currentTarget.value })}
        />
      </label>
      <TypePreview model={s.model} band={band} refLine={refLine} />
      <p data-testid="type-total">Tloušťka celkem: {bandThickness(band)} mm</p>
      <RefLineSelect
        label="Referenční čára (náhled, nové stěny)"
        value={refLine}
        testid="type-refline"
        coreAllowed={hasCore}
        onPick={(v) => ((s.wallRefLine = v), s.changed())}
      />
      <p class="muted">Vrstvy od referenční (vnitřní) strany ke straně tloušťky:</p>
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
        + Přidat vrstvu
      </button>
      <TypeActions s={s} type={type} />
    </div>
  );
}
