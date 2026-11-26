// Skladba typu stěny v okně Editor typů (plán stěn Z1, rozhodnutí 5; vzor Arditu „Skladby“): název,
// vrstvy jako řádky materiál – tloušťka – funkce, „+ vrstva“, součet, použití, duplikovat a smazat.
// Vše přes příkazy jádra (wallType.*), stejně jako AI.
import { bandThickness, wallTypeUsage, type WallType } from '@bim-light/core';
import { useState } from 'preact/hooks';
import type { Session } from '../../session/session.ts';
import { LayerRow } from './LayerRow.tsx';

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

function AddLayer({ s, type }: { s: Session; type: WallType }) {
  const layers = type.bands[0]?.layers ?? [];
  const firstMaterial = layers[layers.length - 1]?.materialId ?? '';
  return (
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
  );
}

export function WallTypeEditor(props: {
  s: Session;
  type: WallType;
  selected?: number | null;
  onSelect?: (layer: number | null) => void;
}) {
  const { s, type } = props;
  const band = type.bands[0];
  if (!band) return null;
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
        <LayerRow
          key={i}
          s={s}
          type={type}
          layer={l}
          i={i}
          count={band.layers.length}
          selected={props.selected === i}
          onSelect={(x) => props.onSelect?.(x)}
        />
      ))}
      <AddLayer s={s} type={type} />
      <TypeActions s={s} type={type} />
    </div>
  );
}
