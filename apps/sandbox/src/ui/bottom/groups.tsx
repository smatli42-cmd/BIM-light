// Skupiny spodní lišty (koncepce rozhraní, část 2 G): zoom, přichytávání, vrstvy (trasování: trace.tsx).
import { zoomTo } from '../../interaction/keyboard.ts';
import { PX_PER_PAPER_MM } from '../../render/primitives.ts';
import type { Session } from '../../session/session.ts';
import type { ScreenOptions } from '../../session/screen.ts';
import { IconButton } from '../icons/Icon.tsx';
import { BarMenu } from './BarMenu.tsx';
import { comboLabel, hideSelectedLayers, invertLayers, lastIsLayerChange } from './layer-actions.ts';

export function setScreen(s: Session, patch: Partial<ScreenOptions>) {
  s.screen = { ...s.screen, ...patch };
  s.changed();
}

/** Přiblížení v % (100 % = skutečná velikost papíru v měřítku okna). */
const percent = (s: Session) => (s.viewport.s * s.view.scale) / PX_PER_PAPER_MM;

function zoomBy(s: Session, k: number) {
  s.viewport.zoomAt({ x: s.viewport.width / 2, y: s.viewport.height / 2 }, k);
  s.changed();
}

export function ZoomGroup({ s }: { s: Session }) {
  const sections = [
    {
      items: [
        { label: 'Vše (Home)', testid: 'zoom-all', onPick: () => (zoomTo(s, false), s.changed()) },
        { label: 'Výběr (Z)', testid: 'zoom-selection', onPick: () => (zoomTo(s, true), s.changed()) },
        { label: 'Oknem', testid: 'tool-zoomwin', onPick: () => s.setTool('zoomwin') },
        { label: '100 %', testid: 'zoom-100', onPick: () => zoomBy(s, 1 / percent(s)) },
      ],
    },
  ];
  return (
    <div class="tool-group">
      <IconButton icon="zoom-out" label="Oddálit" onClick={() => zoomBy(s, 1 / 1.25)} />
      <IconButton icon="zoom-in" label="Přiblížit" onClick={() => zoomBy(s, 1.25)} />
      <BarMenu
        label={`${Math.round(percent(s) * 100)} %`}
        title="Přiblížení"
        testid="zoom-menu"
        sections={sections}
      />
    </div>
  );
}

const STEPS = [0, 10, 50, 100, 250, 500];

export function SnapGroup({ s }: { s: Session }) {
  const sc = s.screen;
  const items = STEPS.map((v) => ({
    label: v ? `${v} mm` : 'vyp.',
    checked: sc.step === v,
    onPick: () => setScreen(s, { step: v }),
  }));
  return (
    <div class="tool-group">
      <IconButton
        icon="guides"
        label="Pomocné prvky"
        testid="guides-toggle"
        pressed={sc.guides}
        onClick={() => setScreen(s, { guides: !sc.guides })}
      />
      <IconButton
        icon="snap"
        label="Přichytávání"
        shortcut="S"
        testid="snap-toggle"
        pressed={sc.snap}
        onClick={() => setScreen(s, { snap: !sc.snap })}
      />
      <BarMenu
        icon="magnet"
        label={sc.step ? `${sc.step} mm` : 'vyp.'}
        title="Krok přichytávání"
        testid="step-menu"
        sections={[{ items }]}
      />
    </div>
  );
}

export function LayerGroup({ s }: { s: Session }) {
  const d = s.model.display;
  const combos = [
    {
      label: 'podle stylu',
      checked: !s.view.local.layerStates,
      onPick: () => s.run('view.setLayerCombination', { viewId: s.view.id, combinationId: null }),
    },
    ...Object.values(d.layerCombinations).map((c) => ({
      label: c.name,
      onPick: () => s.run('view.setLayerCombination', { viewId: s.view.id, combinationId: c.id }),
    })),
  ];
  const quick = [
    { label: 'Přepnout zobrazené / skryté', testid: 'layers-invert', onPick: () => invertLayers(s) },
    {
      label: 'Skrýt vrstvy označených',
      testid: 'layers-hide-selected',
      onPick: () => hideSelectedLayers(s, false),
    },
    {
      label: 'Skrýt ostatní vrstvy',
      testid: 'layers-hide-others',
      onPick: () => hideSelectedLayers(s, true),
    },
    { label: 'Zpět změnu vrstev', disabled: !lastIsLayerChange(s), onPick: () => s.editor.undo() },
  ];
  return (
    <div class="tool-group">
      <BarMenu
        icon="layers"
        label={comboLabel(s)}
        title="Kombinace vrstev"
        testid="combo-menu"
        sections={[{ items: combos }]}
      />
      <BarMenu
        label=""
        icon="isolate"
        title="Rychlé volby vrstev"
        testid="layers-quick"
        sections={[{ items: quick }]}
      />
    </div>
  );
}
