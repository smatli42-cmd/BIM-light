// Sady zobrazení a pracovní okno podlaží (koncepce rozhraní, část 4): přepínač sad nahoře překreslí
// pracovní okno (u otevřeného řezu změní styl řezu, okno zůstane) a filtruje Obsah; uložené pohledy se nemění. Vše přes příkazy jádra.
import { openInActive } from './windows.ts';
import { windowSection } from './section-windows.ts';
import { currentTab } from './tabs.ts';
import { workingViewOf, type Id } from '@bim-light/core';
import type { Session } from './session.ts';

/** Aktuální sada (styl): naposledy zvolená, jinak styl pracovního okna aktuálního podlaží. */
export function currentSet(s: Session): Id {
  // Okno s řezem ukazuje styl řezu (řez má vlastní styl, základ 26).
  const sec = windowSection(s, s.active);
  if (sec) return sec.styleId;
  if (s.setStyleId && s.model.display.styles[s.setStyleId]) return s.setStyleId;
  return workingViewOf(s.model, s.storeyId)?.styleId ?? s.view.styleId;
}

/** Otevře pracovní okno podlaží (vytvoří ho, když ve starém projektu chybí). */
export function openStorey(s: Session, storeyId: Id): void {
  let w = workingViewOf(s.model, storeyId);
  if (!w) {
    const r = s.run('view.create', { storeyId, styleId: currentSet(s), scale: s.view.scale, saved: false });
    w = r.ok && r.created[0] ? (s.model.views[r.created[0]] ?? null) : null;
  }
  if (w) openInActive(s, w.id);
}

/**
 * Přepne sadu: pracovní okno aktuálního podlaží se otevře a všechna okna, která ukazují pracovní okno
 * podlaží (i ve druhém okně vedle), dostanou styl sady; uložené pohledy se nemění. Obsah sadu filtruje.
 */
export function switchSet(s: Session, styleId: Id): void {
  s.setStyleId = styleId;
  // Okno s řezem / výkazem zůstane, jak je (hlášení uživatele 2026-11-27): řez dostane styl sady,
  // pracovní okna podlaží níže také; jen okno s půdorysem se přepne na pracovní okno podlaží.
  const w = s.windows[s.active];
  const kind = w ? currentTab(s, w).kind : 'plan';
  const sec = windowSection(s, s.active);
  if (sec && sec.styleId !== styleId) s.run('section.update', { sectionId: sec.id, styleId });
  if (kind === 'plan') openStorey(s, s.storeyId);
  const ids = new Set(s.windows.map((w) => w.viewId));
  for (const id of ids) {
    const v = s.model.views[id];
    if (v && !v.saved && v.styleId !== styleId) s.run('view.setStyle', { viewId: id, styleId });
  }
  s.changed();
}
