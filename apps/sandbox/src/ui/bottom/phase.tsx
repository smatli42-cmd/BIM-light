// Spodní lišta – Fáze a Konstrukční zobrazení (koncepce rozhraní, část 2 G, položky 9 a 12; plán stěn Z6).
// Fáze = předvolby kombinací přepisů jedním klikem (pravidla grafiky, rozhodnutí 6), mění pohled okna
// příkazem. Konstrukční zobrazení je volba obrazovky (model a IFC beze změny).
import { styleOfView } from '@bim-light/core';
import type { Session } from '../../session/session.ts';
import type { ScreenOptions } from '../../session/screen.ts';
import { BarMenu } from './BarMenu.tsx';
import { setScreen } from './groups.tsx';

const PHASES: [string, string][] = [
  ['Fáze – stávající stav', 'Stávající stav'],
  ['Fáze – bourací práce', 'Bourací práce'],
  ['Fáze – nový stav', 'Nový stav'],
  ['Fáze – srovnávací', 'Srovnávací'],
];

export function PhaseMenu({ s }: { s: Session }) {
  const d = s.model.display;
  const cur = s.view.local.overrideCombinationId ?? styleOfView(d, s.view).overrideCombinationId;
  const byName = (name: string) => Object.values(d.overrideCombinations).find((c) => c.name === name);
  const items = PHASES.flatMap(([name, label]) => {
    const c = byName(name);
    return c
      ? [
          {
            label,
            checked: c.id === cur,
            testid: `phase-${label}`,
            onPick: () => s.run('view.setOverrideCombination', { viewId: s.view.id, combinationId: c.id }),
          },
        ]
      : [];
  });
  const active = PHASES.find(([name]) => byName(name)?.id === cur)?.[1];
  return (
    <BarMenu
      icon="phase"
      label={active ?? 'Fáze'}
      title="Fáze (filtr rekonstrukce okna)"
      testid="phase-menu"
      sections={[{ items }]}
    />
  );
}

const STRUCTURES: [ScreenOptions['structure'], string][] = [
  ['all', 'Celá skladba'],
  ['no-finish', 'Bez povrchů'],
  ['core', 'Jen jádro'],
];

export function StructureMenu({ s }: { s: Session }) {
  const cur = s.screen.structure;
  const items = STRUCTURES.map(([v, label]) => ({
    label,
    checked: v === cur,
    testid: `structure-${v}`,
    onPick: () => setScreen(s, { structure: v }),
  }));
  return (
    <BarMenu
      icon="structure"
      label={STRUCTURES.find((x) => x[0] === cur)?.[1] ?? ''}
      title="Konstrukční zobrazení (jen kresba, model beze změny)"
      testid="structure-menu"
      sections={[{ items }]}
    />
  );
}
