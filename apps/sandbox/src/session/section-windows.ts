// Řez a pohled (fasáda) v pracovním okně (pokyn uživatele 2026-11-27, jako 3D pohled): Obsah, dvojklik na
// značku řezu i „Otevřít řez“ ukážou řez v okně, ve kterém se pracuje, místo půdorysu; podlaží z Obsahu
// vrátí do okna půdorys (windows.ts). Okno si drží jen odkaz na řez, kresba se počítá z modelu.
import type { Id, Section } from '@bim-light/core';
import { is3DFocused } from '../view3d/state.ts';
import type { Session } from './session.ts';
import { leave3D } from './windows.ts';
import { currentTab, showPlanTab } from './tabs.ts';

/** Řez, který okno ukazuje (smazaný řez = zase půdorys). */
export function windowSection(s: Session, index: number): Section | null {
  const w = s.windows[index];
  const t = w && currentTab(s, w);
  return (t?.kind === 'section' && s.model.sections[t.id]) || null;
}

/** Co aktivní okno ukazuje daného druhu, pokud se nepracuje ve 3D (zvýraznění v Obsahu). */
export function activeTabOf(s: Session, kind: 'plan' | 'section' | 'schedule'): Id | null {
  const w = s.windows[s.active];
  if (!w || is3DFocused(s)) return null;
  const t = currentTab(s, w);
  return t.kind === kind ? t.id : null;
}

/** Řez v aktivním okně (zvýraznění v Obsahu). */
export const activeSectionId = (s: Session): Id | null => activeTabOf(s, 'section');

/** Otevře řez v okně, ve kterém se pracuje (místo 3D okna se vrátí pracovní okno). */
export function openSection(s: Session, id: Id) {
  if (!s.model.sections[id]) return;
  leave3D(s, s.viewId);
  s.menu = null;
  showPlanTab(s, s.active, { kind: 'section', id });
}

/** Otevře výkaz / výpis v okně, ve kterém se pracuje (záložka okna, dříve dialog). */
export function openSchedule(s: Session, id: Id) {
  if (!s.model.schedules[id]) return;
  leave3D(s, s.viewId);
  s.menu = null;
  showPlanTab(s, s.active, { kind: 'schedule', id });
}

/** Výkaz, který okno ukazuje (výkaz má přednost před řezem). */
export function windowSchedule(s: Session, index: number): string | null {
  const id = s.windows[index]?.scheduleId;
  return id && s.model.schedules[id] ? id : null;
}
