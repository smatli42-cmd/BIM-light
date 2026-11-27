// Typ desky v okně Editor typů (vzor Arditu „Skladby“): název, značka, funkce, nosná, skladba a její
// vrstvy shora dolů (v datech odspodu), „+ vrstva“ navrch, součet, použití, duplikovat a smazat.
// Vše přes příkazy jádra (slabType.*, composition.*), stejně jako AI.
import {
  SLAB_FUNCTIONS,
  slabThickness,
  slabTypeUsers,
  type SlabFunction,
  type SlabType,
} from '@bim-light/core';
import type { Session } from '../../session/session.ts';
import { LayerRow } from './LayerRow.tsx';
import { SlabTypeActions } from './SlabTypeActions.tsx';
import { SLAB_GROUPS } from './SlabTypeList.tsx';

function Props({ s, type }: { s: Session; type: SlabType }) {
  const update = (p: Record<string, unknown>) => s.run('slabType.update', { typeId: type.id, ...p });
  return (
    <div class="te-composition">
      <label>
        Značka
        <input
          data-testid="slab-type-mark"
          key={type.mark}
          defaultValue={type.mark}
          onChange={(e) => update({ mark: e.currentTarget.value })}
        />
      </label>
      <label>
        Funkce
        <select
          data-testid="slab-type-function"
          value={type.slabFunction}
          onChange={(e) => update({ slabFunction: e.currentTarget.value as SlabFunction })}
        >
          {SLAB_FUNCTIONS.map((f) => (
            <option key={f} value={f}>
              {SLAB_GROUPS[f]}
            </option>
          ))}
        </select>
      </label>
      <label class="check">
        <input
          type="checkbox"
          data-testid="slab-type-loadbearing"
          checked={type.loadBearing}
          onChange={(e) => update({ loadBearing: e.currentTarget.checked })}
        />
        Nosná (LoadBearing)
      </label>
    </div>
  );
}

function Composition({ s, type }: { s: Session; type: SlabType }) {
  const c = s.model.compositions[type.compositionId];
  if (!c) return null;
  const users = slabTypeUsers(s.model, c.id);
  const options = Object.values(s.model.compositions).filter((x) => x.use.slab || x.id === c.id);
  return (
    <div class="te-composition" data-testid="composition">
      <label>
        Skladba
        <select
          data-testid="composition-select"
          value={c.id}
          onChange={(e) =>
            s.run('slabType.update', { typeId: type.id, compositionId: e.currentTarget.value })
          }
        >
          {options.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Název skladby
        <input
          data-testid="composition-name"
          key={c.name}
          defaultValue={c.name}
          onChange={(e) => s.run('composition.rename', { compositionId: c.id, name: e.currentTarget.value })}
        />
      </label>
      {users.length > 1 && (
        <p class="muted" data-testid="composition-shared">
          Sdílí {users.length} typy: {users.map((t) => t.name).join(', ')} – změna vrstev platí pro všechny.
        </p>
      )}
    </div>
  );
}

function LayerHead() {
  return (
    <>
      <p class="muted">Vrstvy shora dolů (horní líc = referenční rovina desky):</p>
      <div class="type-layer-head muted">
        <span />
        <span>Materiál</span>
        <span>mm</span>
        <span>Funkce</span>
        <span />
      </div>
    </>
  );
}

/** Nová vrstva navrch (stejný materiál jako dosavadní horní vrstva, 10 mm, povrch). */
function AddLayer(p: { s: Session; typeId: string; materialId: string }) {
  const layer = { materialId: p.materialId, thickness: 10, function: 'finish' };
  return (
    <button data-testid="layer-add" onClick={() => p.s.run('slabType.addLayer', { typeId: p.typeId, layer })}>
      + vrstva navrch
    </button>
  );
}

export function SlabTypeEditor(props: {
  s: Session;
  type: SlabType;
  selected: number | null;
  onSelect: (layer: number | null) => void;
}) {
  const { s, type } = props;
  const layers = s.model.compositions[type.compositionId]?.layers ?? [];
  const order = layers.map((l, i) => ({ l, i })).reverse();
  return (
    <div class="type-editor" data-testid="type-editor">
      <label class="type-name">
        <input
          data-testid="type-name"
          key={type.name}
          defaultValue={type.name}
          onChange={(e) => s.run('slabType.update', { typeId: type.id, name: e.currentTarget.value })}
        />
        <span data-testid="type-total">{slabThickness(s.model, type.id)} mm</span>
      </label>
      <Props s={s} type={type} />
      <Composition s={s} type={type} />
      <LayerHead />
      {order.map(({ l, i }) => (
        <LayerRow
          key={i}
          s={s}
          kind="slabType"
          typeId={type.id}
          layer={l}
          i={i}
          count={layers.length}
          selected={props.selected === i}
          onSelect={props.onSelect}
        />
      ))}
      <AddLayer s={s} typeId={type.id} materialId={layers[layers.length - 1]?.materialId ?? ''} />
      <SlabTypeActions s={s} type={type} />
    </div>
  );
}
