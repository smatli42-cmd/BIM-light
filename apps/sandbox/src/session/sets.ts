// Sady zobrazení a pracovní okno podlaží (koncepce rozhraní, část 4): přepínač sad nahoře překreslí
// pracovní okno a filtruje Obsah; uložené pohledy se nemění. Vše přes příkazy jádra.
import { workingViewOf, type Id } from '@bim-light/core';
import type { Session } from './session.ts';

/** Aktuální sada (styl): naposledy zvolená, jinak styl pracovního okna aktuálního podlaží. */
export function currentSet(s: Session): Id {
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
  if (w) s.setView(w.id);
}

/** Přepne sadu: pracovní okno aktuálního podlaží dostane její styl a otevře se; Obsah ji filtruje. */
export function switchSet(s: Session, styleId: Id): void {
  s.setStyleId = styleId;
  openStorey(s, s.storeyId);
  if (s.view.styleId !== styleId) s.run('view.setStyle', { viewId: s.view.id, styleId });
  s.changed();
}
