// Ovládání pohledu (katalog pohledů: jednoduché ovládání, úroveň 1): nový pohled, přepínač stylu
// jedním klikem, „styl (upraveno)“ + Vrátit, měřítko, šrafy, rovina řezu a aktivní skupina anotací.
// Vše přes příkazy. Rozmístění v okně: koncepce rozhraní, část 2 (A, E, G).
import { activeAnnotationLayer, DEFAULT_SCALES, isViewModified, styleOfView } from '@bim-light/core';
import { useState } from 'preact/hooks';
import type { Session } from '../session/session.ts';
import { currentSet, switchSet } from '../session/sets.ts';
import { openInActive } from '../session/windows.ts';
import { windowSection } from '../session/section-windows.ts';

export function NewView({ s, onDone }: { s: Session; onDone: () => void }) {
  const storeys = Object.values(s.model.storeys);
  const styles = Object.values(s.model.display.styles);
  const [storeyId, setStorey] = useState(s.storeyId);
  const [styleId, setStyle] = useState(s.view.styleId);
  const [scale, setScale] = useState(s.model.display.styles[s.view.styleId]?.defaultScale ?? 100);
  const create = () => {
    const r = s.run('view.create', { storeyId, styleId, scale });
    if (r.ok && r.created[0]) openInActive(s, r.created[0]);
    onDone();
  };
  return (
    <span class="new-view" data-testid="new-view">
      <select value={storeyId} onChange={(e) => setStorey(e.currentTarget.value)}>
        {storeys.map((st) => (
          <option key={st.id} value={st.id}>
            {st.name}
          </option>
        ))}
      </select>
      <select
        data-testid="new-view-style"
        value={styleId}
        onChange={(e) => {
          setStyle(e.currentTarget.value);
          setScale(s.model.display.styles[e.currentTarget.value]?.defaultScale ?? scale);
        }}
      >
        {styles.map((st) => (
          <option key={st.id} value={st.id}>
            {st.name}
          </option>
        ))}
      </select>
      <ScaleSelect value={scale} onPick={setScale} testid="new-view-scale" />
      <button data-testid="new-view-create" onClick={create}>
        Vytvořit
      </button>
      <button onClick={onDone}>Zrušit</button>
    </span>
  );
}

export function ScaleSelect(props: { value: number; onPick: (v: number) => void; testid: string }) {
  const scales = DEFAULT_SCALES.includes(props.value as never)
    ? DEFAULT_SCALES
    : [...DEFAULT_SCALES, props.value];
  return (
    <select
      data-testid={props.testid}
      value={props.value}
      onChange={(e) => props.onPick(Number(e.currentTarget.value))}
    >
      {scales.map((v) => (
        <option key={v} value={v}>
          1:{v}
        </option>
      ))}
    </select>
  );
}

/**
 * Přepínač sad (koncepce rozhraní, část 4): překreslí pracovní okno stylem sady a filtruje Obsah. Stav
 * ukazuje styl aktivního okna (u uloženého pohledu jeho vlastní).
 */
export function StyleSwitch({ s }: { s: Session }) {
  const v = s.view;
  const sec = windowSection(s, s.active);
  const style = sec ? styleOfView(s.model.display, sec) : styleOfView(s.model.display, v);
  const modified = !sec && isViewModified(v);
  const set = currentSet(s);
  return (
    <span class="style-switch">
      <span class="seg">
        {Object.values(s.model.display.styles).map((st) => (
          <button
            key={st.id}
            data-testid={`style-${st.name}`}
            class={st.id === set ? 'active' : ''}
            onClick={() => switchSet(s, st.id)}
          >
            {st.name}
          </button>
        ))}
      </span>
      <span class="muted" data-testid="style-state">
        {sec ? `řez: ${sec.name} · ` : v.saved ? `pohled: ${v.name} · ` : ''}styl: {style.name}
        {modified ? ' (upraveno)' : ''}
      </span>
      {modified && (
        <button data-testid="style-reset" onClick={() => s.run('view.resetToStyle', { viewId: v.id })}>
          Vrátit
        </button>
      )}
    </span>
  );
}

/** Měřítko šraf stylu (0,5–3): mění velikost všech šraf najednou, platí pro celý styl. */
export function HatchScale({ s }: { s: Session }) {
  const style = styleOfView(s.model.display, s.view);
  return (
    <label class="muted" title="Násobí rozteče a velikosti všech šraf stylu (0,5–3)">
      Šrafy ×
      <input
        data-testid="hatch-scale"
        type="number"
        min={0.5}
        max={3}
        step={0.1}
        value={style.hatchScale}
        style={{ width: '4.5em' }}
        onChange={(e) => {
          const v = Number(e.currentTarget.value);
          if (v >= 0.5 && v <= 3) s.run('style.setHatchScale', { styleId: style.id, hatchScale: v });
        }}
      />
    </label>
  );
}

/** Rovina řezu pohledu nad podlažím (plán stěn Z4): otvor, který ji protíná, stěnu přeruší. */
export function CutPlane({ s }: { s: Session }) {
  return (
    <label class="muted" title="Výška roviny řezu půdorysu nad podlažím (mm)">
      Řez
      <input
        data-testid="cut-plane"
        type="number"
        min={0}
        step={100}
        value={s.view.cutPlane}
        style={{ width: '5.5em' }}
        onChange={(e) => {
          const v = Number(e.currentTarget.value);
          if (v >= 0) s.run('view.setCutPlane', { viewId: s.view.id, height: v });
        }}
      />
    </label>
  );
}

/** Skupina anotací, do které jdou nové kóty (základ 28). */
export function AnnotationGroup({ s }: { s: Session }) {
  const v = s.view;
  const groups = Object.values(s.model.display.layers).filter((l) => l.kind === 'annotation');
  return (
    <label class="muted" title="Skupina anotací pro nové kóty">
      Kóty do
      <select
        data-testid="annotation-group"
        value={activeAnnotationLayer(s.model, v)}
        onChange={(e) =>
          s.run('view.setActiveAnnotationLayer', { viewId: v.id, layerId: e.currentTarget.value })
        }
      >
        {groups.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </select>
    </label>
  );
}
