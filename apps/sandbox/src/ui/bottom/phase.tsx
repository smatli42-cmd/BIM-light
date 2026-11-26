// Fáze (filtr rekonstrukce) a Konstrukční zobrazení (koncepce rozhraní, část 2 G, položky 9 a 12).
// Filtr rekonstrukce je nastavení pohledu (jako v Arditu / Archicadu), platí vedle grafických přepisů;
// v liště i v Nastavení pohledu je totéž nastavení (příkaz view.setPhaseFilter). Konstrukční zobrazení
// je volba obrazovky (model a IFC beze změny).
import type { Id, Model, View } from '@bim-light/core';
import type { Session } from '../../session/session.ts';
import type { ScreenOptions } from '../../session/screen.ts';
import { BarMenu } from './BarMenu.tsx';
import { setScreen } from './groups.tsx';

/** Předvolby fází projektu: id a krátký název (bez „Fáze – “), první písmeno velké. */
export function phaseFilters(model: Model): { id: Id; label: string }[] {
  return Object.values(model.display.overrideCombinations)
    .filter((c) => c.phase)
    .map((c) => {
      const t = c.name.replace(/^Fáze – /, '');
      return { id: c.id, label: t.charAt(0).toUpperCase() + t.slice(1) };
    });
}

export const phaseLabel = (model: Model, view: View): string =>
  phaseFilters(model).find((f) => f.id === view.phaseFilterId)?.label ?? 'Vše';

export function PhaseMenu({ s }: { s: Session }) {
  const v = s.view;
  const set = (filterId: Id | null) => s.run('view.setPhaseFilter', { viewId: v.id, filterId });
  const items = [
    ...phaseFilters(s.model).map((f) => ({
      label: f.label,
      checked: f.id === v.phaseFilterId,
      testid: `phase-${f.label}`,
      onPick: () => set(f.id),
    })),
    { label: 'Vše', checked: v.phaseFilterId === null, testid: 'phase-Vše', onPick: () => set(null) },
  ];
  return (
    <BarMenu
      icon="phase"
      label={v.phaseFilterId ? phaseLabel(s.model, v) : 'Fáze'}
      title="Filtr rekonstrukce (fáze) okna"
      testid="phase-menu"
      sections={[{ items }]}
    />
  );
}

const STRUCTURES: [ScreenOptions['structure'], string][] = [
  ['all', 'Celá skladba'],
  ['no-finish', 'Bez povrchů'],
  ['core', 'Jen jádro'],
  ['bearing-core', 'Jen jádro nosných'],
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
