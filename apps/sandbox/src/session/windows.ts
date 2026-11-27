// Okna vedle sebe (koncepce rozhraní, části 2 E a G): rozvržení a aktivní okno. Nástroje, Obsah
// a spodní lišta pracují s aktivním oknem; neaktivní okno jen kreslí svůj pohled.
import { Viewport } from '../canvas/viewport.ts';
import type { WindowState } from './screen.ts';
import type { Session } from './session.ts';
import { blur3D, close3D, is3DFocused } from '../view3d/state.ts';

/** Jedno okno, nebo dvě vedle sebe (druhé začne se stejným pohledem a výřezem). */
export function setLayout(s: Session, n: 1 | 2) {
  if (n === 2 && s.windows.length === 1) {
    const vp = Object.assign(new Viewport(), s.viewport);
    s.windows.push({ viewId: s.viewId, viewport: vp });
  }
  if (n === 1 && s.windows.length > 1) {
    s.windows.splice(0, s.windows.length, s.windows[s.active] as WindowState);
    s.active = 0;
  }
  s.changed();
}

/** Udělá okno aktivním (klik do něj); jiné podlaží = zruší výběr. */
export function activate(s: Session, i: number) {
  blur3D(s);
  if (i === s.active || !s.windows[i]) return;
  const storey = s.storeyId;
  s.active = i;
  if (s.storeyId !== storey) s.selection.set([]);
  s.menu = null;
  s.changed();
}

/**
 * Otevře pohled z Obsahu v okně, ve kterém se pracuje (princip Arditu). Pracuje-li se ve 3D okně, nahradí
 * ho okno půdorysu na stejném místě (vpravo); levé okno se nemění.
 */
export function openInActive(s: Session, viewId: string) {
  if (is3DFocused(s)) {
    close3D(s);
    if (s.windows.length === 1) {
      s.windows.push({ viewId, viewport: Object.assign(new Viewport(), s.viewport) });
    }
    activate(s, s.windows.length - 1);
  }
  s.setView(viewId);
  s.changed();
}

/** Přepne pohled v daném okně (aktivní okno přes setView, jinak jen změní jeho pohled). */
export function setWindowView(s: Session, i: number, viewId: string) {
  if (i === s.active) return s.setView(viewId);
  const w = s.windows[i];
  if (!w || !s.model.views[viewId]) return;
  w.viewId = viewId;
  s.changed();
}
