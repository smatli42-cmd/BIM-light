// Spodní lišta – vzhled okna (koncepce rozhraní, část 2 G): skutečná tloušťka čar, průchozí materiál,
// izolovat popisy, karty prvků, pera a barvy, grafické přepisy a Odhalit.
// Podrobnost (hrubá / střední / jemná) v liště není – nastavuje se jinde (pokyn uživatele 2026-11-26).
import { styleOfView } from '@bim-light/core';
import { useState } from 'preact/hooks';
import type { Session } from '../../session/session.ts';
import { IconButton } from '../icons/Icon.tsx';
import { BarMenu } from './BarMenu.tsx';
import { setScreen } from './groups.tsx';
import { PensDialog } from './PensDialog.tsx';

export function LookGroup({ s }: { s: Session }) {
  const sc = s.screen;
  const [pens, setPens] = useState(false);
  const toggle = (k: 'trueWeight' | 'mergeMaterials' | 'isolate' | 'infoCards') =>
    setScreen(s, { [k]: !sc[k] });
  return (
    <div class="tool-group">
      <IconButton
        icon="line-weight"
        label={sc.trueWeight ? 'Skutečná tloušťka čar' : 'Vlasové čáry'}
        testid="weight-toggle"
        pressed={sc.trueWeight}
        onClick={() => toggle('trueWeight')}
      />
      <IconButton
        icon="merge-material"
        label="Průchozí materiál"
        testid="merge-toggle"
        pressed={sc.mergeMaterials}
        onClick={() => toggle('mergeMaterials')}
      />
      <IconButton
        icon="isolate"
        label="Izolovat popisy"
        testid="isolate-toggle"
        pressed={sc.isolate}
        onClick={() => toggle('isolate')}
      />
      <IconButton
        icon="card"
        label={
          sc.infoCards ? 'Karty prvků po podržení myši (zapnuto)' : 'Karty prvků po podržení myši (vypnuto)'
        }
        testid="cards-toggle"
        pressed={sc.infoCards}
        onClick={() => toggle('infoCards')}
      />
      <IconButton icon="pen" label="Pera a barvy" testid="pens-open" onClick={() => setPens(true)} />
      {pens && <PensDialog s={s} onClose={() => setPens(false)} />}
    </div>
  );
}

export function OverridesMenu({ s }: { s: Session }) {
  const d = s.model.display;
  const cur = s.view.local.overrideCombinationId ?? styleOfView(d, s.view).overrideCombinationId;
  const items = Object.values(d.overrideCombinations)
    .filter((c) => !c.phase)
    .map((c) => ({
      label: c.name,
      checked: c.id === cur,
      onPick: () => s.run('view.setOverrideCombination', { viewId: s.view.id, combinationId: c.id }),
    }));
  return (
    <BarMenu
      icon="overrides"
      label={d.overrideCombinations[cur]?.name ?? '–'}
      title="Grafické přepisy"
      testid="overrides-menu"
      sections={[{ items }]}
    />
  );
}

export function RevealToggle({ s }: { s: Session }) {
  return (
    <IconButton
      icon="reveal"
      label="Odhalit skryté prvky"
      testid="reveal-toggle"
      pressed={s.screen.reveal}
      onClick={() => setScreen(s, { reveal: !s.screen.reveal })}
    />
  );
}
