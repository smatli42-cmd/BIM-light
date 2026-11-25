// Spodní lišta – vzhled okna (koncepce rozhraní, část 2 G): skutečná tloušťka čar, průchozí materiál,
// izolovat popisy, pera a barvy, grafické přepisy, podrobnost a Odhalit.
import { detailOf, styleOfView, type Detail } from '@bim-light/core';
import { useState } from 'preact/hooks';
import type { Session } from '../../session/session.ts';
import { IconButton } from '../icons/Icon.tsx';
import { BarMenu } from './BarMenu.tsx';
import { setScreen } from './groups.tsx';
import { PensDialog } from './PensDialog.tsx';

const DETAILS: [Detail, string][] = [
  ['coarse', 'Hrubá'],
  ['medium', 'Střední'],
  ['fine', 'Jemná'],
];

export function LookGroup({ s }: { s: Session }) {
  const sc = s.screen;
  const [pens, setPens] = useState(false);
  const toggle = (k: 'trueWeight' | 'mergeMaterials' | 'isolate') => setScreen(s, { [k]: !sc[k] });
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
      <IconButton icon="pen" label="Pera a barvy" testid="pens-open" onClick={() => setPens(true)} />
      {pens && <PensDialog s={s} onClose={() => setPens(false)} />}
    </div>
  );
}

export function OverridesMenu({ s }: { s: Session }) {
  const d = s.model.display;
  const cur = s.view.local.overrideCombinationId ?? styleOfView(d, s.view).overrideCombinationId;
  const items = Object.values(d.overrideCombinations).map((c) => ({
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

export function DetailMenu({ s }: { s: Session }) {
  const cur = detailOf(s.model.display, s.view);
  const items = DETAILS.map(([v, label]) => ({
    label,
    checked: v === cur,
    onPick: () => s.run('view.setDetail', { viewId: s.view.id, detail: v }),
  }));
  return (
    <BarMenu
      icon="detail"
      label={DETAILS.find((x) => x[0] === cur)?.[1] ?? ''}
      title="Podrobnost"
      testid="detail-menu"
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
