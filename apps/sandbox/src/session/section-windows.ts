// Řez a pohled (fasáda) v pracovním okně (pokyn uživatele 2026-11-27, jako 3D pohled): Obsah, dvojklik na
// značku řezu i „Otevřít řez“ ukážou řez v okně, ve kterém se pracuje, místo půdorysu; podlaží z Obsahu
// vrátí do okna půdorys (windows.ts). Okno si drží jen odkaz na řez, kresba se počítá z modelu.
import type { Id, Section } from '@bim-light/core';
import { is3DFocused } from '../view3d/state.ts';
import type { Session } from './session.ts';
import { leave3D } from './windows.ts';

/** Řez, který okno ukazuje (smazaný řez = zase půdorys). */
export function windowSection(s: Session, index: number): Section | null {
  const id = s.windows[index]?.sectionId;
  return (id && s.model.sections[id]) || null;
}

/** Řez v aktivním okně, pokud se nepracuje ve 3D (zvýraznění v Obsahu). */
export const activeSectionId = (s: Session): Id | null =>
  is3DFocused(s) ? null : (windowSection(s, s.active)?.id ?? null);

/** Otevře řez v okně, ve kterém se pracuje (místo 3D okna se vrátí pracovní okno). */
export function openSection(s: Session, id: Id) {
  if (!s.model.sections[id]) return;
  leave3D(s, s.viewId);
  const w = s.windows[s.active];
  if (!w) return;
  w.sectionId = id;
  s.menu = null;
  s.changed();
}
