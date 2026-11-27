// Fáze (filtr rekonstrukce) a Konstrukční zobrazení (koncepce rozhraní, část 2 G, položky 9 a 12).
// Filtr rekonstrukce je nastavení pohledu (jako v Arditu / Archicadu), platí vedle grafických přepisů;
// v liště i v Nastavení pohledu je totéž nastavení (příkaz view.setPhaseFilter). Konstrukční zobrazení
// je volba obrazovky (model a IFC beze změny).
import type { Id, Model, View } from '@bim-light/core';
import type { Session } from '../../session/session.ts';
import type { ScreenOptions } from '../../session/screen.ts';
import { BarMenu } from './BarMenu.tsx';
import { setScreen } from './groups.tsx';
import { active3d, is3DFocused } from '../../view3d/state.ts';
import { windowSection } from '../../session/section-windows.ts';

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

/** Pohled aktivního okna a příkaz, který mu nastaví fázi (3D, řez, jinak půdorys). */
function phaseTarget(s: Session): {
  id: Id;
  phaseFilterId: Id | null;
  set: (f: Id | null) => void;
  what: string;
} {
  if (is3DFocused(s)) {
    const v = active3d(s);
    return {
      ...v,
      what: '3D okna',
      set: (filterId) => s.run('view3d.setPhaseFilter', { viewId: v.id, filterId }),
    };
  }
  const sec = windowSection(s, s.active);
  if (sec)
    return {
      ...sec,
      what: 'řezu',
      set: (phaseFilterId) => s.run('section.update', { sectionId: sec.id, phaseFilterId }),
    };
  const v = s.view;
  return { ...v, what: 'okna', set: (filterId) => s.run('view.setPhaseFilter', { viewId: v.id, filterId }) };
}

/**
 * Fáze aktivního okna (hlášení uživatele 2026-11-27: přepnutí v liště při aktivním 3D okně / řezu měnilo
 * půdorys). Lišta patří aktivnímu oknu: 3D, řez (Revit: každý pohled má svou fázi), jinak půdorys.
 */
export function PhaseMenu({ s }: { s: Session }) {
  const v = phaseTarget(s);
  const set = v.set;
  const items = [
    ...phaseFilters(s.model).map((f) => ({
      label: f.label,
      checked: f.id === v.phaseFilterId,
      testid: `phase-${f.label}`,
      onPick: () => set(f.id),
    })),
    { label: 'Vše', checked: v.phaseFilterId === null, testid: 'phase-Vše', onPick: () => set(null) },
  ];
  const label = phaseFilters(s.model).find((f) => f.id === v.phaseFilterId)?.label;
  return (
    <BarMenu
      icon="phase"
      label={label ?? 'Fáze'}
      title={`Filtr rekonstrukce (fáze) ${v.what}`}
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
