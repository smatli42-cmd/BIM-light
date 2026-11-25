// Nastavení uloženého pohledu (koncepce rozhraní, části 2 F a 4): název, zdroj, styl (kombinace),
// měřítko, řezná rovina; fáze a varianta jsou připravené („podle okna“, ovládání přijde s fázemi Z6 a
// s etapou variant). Vše přes příkazy jádra.
import { workingViewOf, type Id } from '@bim-light/core';
import type { Session } from '../../session/session.ts';
import { NumberInput } from '../NumberInput.tsx';
import { ScaleSelect } from '../ViewControls.tsx';
import { Section } from '../infobox/Section.tsx';

function Row({ label, children }: { label: string; children: preact.ComponentChildren }) {
  return (
    <label class="vs-row">
      <span class="muted">{label}</span>
      {children}
    </label>
  );
}

/** Fáze a varianta: zatím jen „podle okna“ (fáze přijdou se stěnami Z6, varianty s jejich etapou). */
function FuturePlaceholders() {
  return (
    <>
      <Row label="Fáze">
        <select disabled title="Přijde s předvolbami fází (stěny Z6)">
          <option>podle okna</option>
        </select>
      </Row>
      <Row label="Varianta">
        <select disabled title="Přijde s etapou variant">
          <option>podle okna</option>
        </select>
      </Row>
    </>
  );
}

function NameField({ s, viewId, name }: { s: Session; viewId: Id; name: string }) {
  const rename = (value: string) => value !== name && s.run('view.rename', { viewId, name: value });
  return (
    <Row label="Název">
      <input
        data-testid="vs-name"
        defaultValue={name}
        onKeyDown={(e) => e.key === 'Enter' && rename(e.currentTarget.value)}
        onBlur={(e) => rename(e.currentTarget.value)}
      />
    </Row>
  );
}

function StyleField({ s, viewId, styleId }: { s: Session; viewId: Id; styleId: Id }) {
  return (
    <Row label="Styl (kombinace)">
      <select
        data-testid="vs-style"
        value={styleId}
        onChange={(e) => s.run('view.setStyle', { viewId, styleId: e.currentTarget.value })}
      >
        {Object.values(s.model.display.styles).map((st) => (
          <option key={st.id} value={st.id}>
            {st.name}
          </option>
        ))}
      </select>
    </Row>
  );
}

export function ViewSettings({ s, viewId }: { s: Session; viewId: Id }) {
  const v = s.model.views[viewId];
  if (!v) return null;
  const source = s.view.id === v.id ? workingViewOf(s.model, v.storeyId) : s.view;
  return (
    <Section title="Nastavení pohledu" testid="view-settings">
      <NameField s={s} viewId={viewId} name={v.name} />
      <Row label="Zdroj">
        <input value={`Půdorys ${s.model.storeys[v.storeyId]?.name ?? ''}`} disabled />
      </Row>
      <StyleField s={s} viewId={viewId} styleId={v.styleId} />
      <Row label="Měřítko">
        <ScaleSelect
          value={v.scale}
          testid="vs-scale"
          onPick={(scale) => s.run('view.setScale', { viewId, scale })}
        />
      </Row>
      <Row label="Řezná rovina (mm)">
        <NumberInput
          testid="vs-cut"
          value={v.cutPlane}
          onSet={(height) => s.run('view.setCutPlane', { viewId, height })}
        />
      </Row>
      <FuturePlaceholders />
      {source && source.id !== v.id && (
        <button
          data-testid="vs-load"
          onClick={() => s.run('view.loadSettings', { viewId, fromViewId: source.id })}
        >
          Načíst nastavení aktuálního okna
        </button>
      )}
      <button class="danger" data-testid="vs-delete" onClick={() => s.run('view.delete', { viewId })}>
        Smazat pohled
      </button>
    </Section>
  );
}
