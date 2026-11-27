// Záložky pohledů v záhlaví okna (pokyn uživatele 2026-11-27, princip Arditu): každé otevření pohledu (podlaží,
// uložený pohled, řez, fasáda, výkaz, 3D) přidá do okna záložku a přepne se na ni; už otevřená se jen
// přepne. Záložky jsou historie prohlížených pohledů okna, × zavře (aktivní → sousední vpravo, jinak vlevo;
// poslední zůstane). Stav obrazovky, ne data projektu: bez příkazu jádra, nepamatuje se po obnovení stránky.
import type { Id } from '@bim-light/core';
import type { WindowState } from './screen.ts';
import type { Session } from './session.ts';

export type ViewTab =
  | { readonly kind: 'plan'; readonly id: Id }
  | { readonly kind: 'section'; readonly id: Id }
  | { readonly kind: 'schedule'; readonly id: Id }
  | { readonly kind: '3d'; readonly id: Id };

export const tabKey = (t: ViewTab): string => `${t.kind}:${t.id}`;
export const sameTab = (a: ViewTab, b: ViewTab): boolean => tabKey(a) === tabKey(b);

/** Co okno právě ukazuje (výkaz > řez > půdorys). */
export function currentTab(s: Session, w: WindowState): ViewTab {
  if (w.scheduleId && s.model.schedules[w.scheduleId]) return { kind: 'schedule', id: w.scheduleId };
  if (w.sectionId && s.model.sections[w.sectionId]) return { kind: 'section', id: w.sectionId };
  return { kind: 'plan', id: w.viewId };
}

/** Existuje pohled záložky ještě v projektu? (Smazaný řez / výkaz záložku zavře.) */
export function tabExists(s: Session, t: ViewTab): boolean {
  if (t.kind === 'plan') return !!s.model.views[t.id];
  if (t.kind === 'section') return !!s.model.sections[t.id];
  if (t.kind === 'schedule') return !!s.model.schedules[t.id];
  return !!s.model.views3d[t.id];
}

/** Přidá záložku na konec, pokud v seznamu ještě není. */
export const withTab = (tabs: readonly ViewTab[], t: ViewTab): ViewTab[] =>
  tabs.some((x) => sameTab(x, t)) ? [...tabs] : [...tabs, t];

/** Záložky okna: platné uložené + to, co okno právě ukazuje. */
export function windowTabs(s: Session, i: number): ViewTab[] {
  const w = s.windows[i];
  if (!w) return [];
  return withTab(
    (w.tabs ?? []).filter((t) => tabExists(s, t)),
    currentTab(s, w),
  );
}

/** Zapamatuje si, co okno ukazuje, jako záložku. */
export function rememberTab(s: Session, i: number) {
  const w = s.windows[i];
  if (w) w.tabs = windowTabs(s, i);
}

/** Přepne okno na pohled záložky (3D řeší view3d/state.ts); záložku přidá, pokud chybí. */
export function showPlanTab(s: Session, i: number, t: Exclude<ViewTab, { kind: '3d' }>) {
  const w = s.windows[i];
  if (!w || !tabExists(s, t)) return;
  w.tabs = windowTabs(s, i);
  if (t.kind === 'plan') {
    w.sectionId = null;
    w.scheduleId = null;
    if (i === s.active) s.setView(t.id);
    else w.viewId = t.id;
  } else if (t.kind === 'section') {
    w.sectionId = t.id;
    w.scheduleId = null;
  } else w.scheduleId = t.id;
  w.tabs = withTab(w.tabs, t);
  s.changed();
}

/** Zavře záložku; aktivní přepne na sousední (vpravo, jinak vlevo). Poslední záložka okna zůstane. */
export function closeTab(s: Session, i: number, t: ViewTab, show: (next: ViewTab) => void) {
  const w = s.windows[i];
  const tabs = windowTabs(s, i);
  if (!w || tabs.length < 2) return;
  const at = tabs.findIndex((x) => sameTab(x, t));
  if (at < 0) return;
  const rest = tabs.filter((_, k) => k !== at);
  const next = rest[Math.min(at, rest.length - 1)];
  // Nejdřív přepnout (okno pak zavíranou záložku neukazuje), potom uložit seznam bez ní.
  if (sameTab(currentTab(s, w), t) && next) show(next);
  w.tabs = rest;
  s.changed();
}
