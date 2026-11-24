// Panel Vrstvy (katalog pohledů: úroveň 2, podle arditu): kombinace vrstev stylu, oko (viditelná)
// a zámek (nejde vybrat ani upravit) u každé vrstvy, „Uložit jako styl…“ a × (zruší místní úpravy).
// Modelové prvky spadají do vrstvy podle kategorie; anotace (kóty) do skupiny anotací.
import { isViewModified, layerState, styleOfView, type Layer } from '@bim-light/core';
import { useState } from 'preact/hooks';
import type { Session } from '../session/session.ts';

function LayerRow({ s, layer }: { s: Session; layer: Layer }) {
  const st = layerState(s.model.display, s.view, layer.id);
  const set = (patch: { visible?: boolean; locked?: boolean }) =>
    s.run('view.setLayerState', { viewId: s.viewId, layerId: layer.id, ...patch });
  return (
    <li class="layer-item" data-testid={`layer-${layer.name}`}>
      <button
        data-testid="layer-eye"
        class={st.visible ? 'on' : 'off'}
        title={st.visible ? 'Viditelná – skrýt' : 'Skrytá – zobrazit'}
        onClick={() => set({ visible: !st.visible })}
      >
        {st.visible ? '👁' : '–'}
      </button>
      <button
        data-testid="layer-lock"
        class={st.locked ? 'on' : 'off'}
        title={st.locked ? 'Zamčená – odemknout' : 'Odemčená – zamknout'}
        onClick={() => set({ locked: !st.locked })}
      >
        {st.locked ? '🔒' : '🔓'}
      </button>
      <span>{layer.name}</span>
    </li>
  );
}

export function LayersPanel({ s }: { s: Session }) {
  const [query, setQuery] = useState('');
  const [name, setName] = useState('');
  const v = s.view;
  const d = s.model.display;
  const style = styleOfView(d, v);
  const combo = d.layerCombinations[style.layerCombinationId];
  const q = query.trim().toLowerCase();
  const layers = Object.values(d.layers).filter((l) => !q || l.name.toLowerCase().includes(q));
  const save = () => {
    // Příkaz styl uloží a pohled ho rovnou začne používat (jeden krok Undo).
    s.run('style.saveFromView', { viewId: v.id, name: name.trim() || `${style.name} – kopie` });
    setName('');
  };
  return (
    <section data-testid="layers-panel">
      <h2>
        Vrstvy · {combo?.name ?? style.name}
        {isViewModified(v) ? ' (upraveno)' : ''}
      </h2>
      {isViewModified(v) && (
        <button
          data-testid="layers-reset"
          title="Zrušit místní úpravy"
          onClick={() => s.run('view.resetToStyle', { viewId: v.id })}
        >
          × Zrušit úpravy
        </button>
      )}
      <input placeholder="Hledat vrstvu…" value={query} onInput={(e) => setQuery(e.currentTarget.value)} />
      <ul class="layer-list">
        {layers.map((l) => (
          <LayerRow key={l.id} s={s} layer={l} />
        ))}
      </ul>
      <label>
        Uložit jako styl
        <input
          data-testid="save-style-name"
          placeholder="název stylu"
          value={name}
          onInput={(e) => setName(e.currentTarget.value)}
        />
      </label>
      <button data-testid="save-style" onClick={save}>
        Uložit jako…
      </button>
    </section>
  );
}
