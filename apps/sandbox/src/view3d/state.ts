// Stav 3D okna (koncepce rozhraní, část 2 E a G, řádek 10): otevřené / zavřené a co ukazuje – celý model
// (Zobrazit vše ve 3D, Ctrl+F4) nebo jen výběr (Zobrazit výběr ve 3D, F4). Volba obrazovky, ne data modelu,
// proto nejde přes příkaz (jako rozvržení oken). Drží se vedle Session, aby se Session neměnila.
import type { Id } from '@bim-light/core';
import type { Session } from '../session/session.ts';
import { selectionElements } from './scene-model.ts';

export interface View3DState {
  open: boolean;
  /** Jen tyto prvky (výběr ve 3D); null = celý model. */
  only: Id[] | null;
  /** Zvýší se při každém „zobrazit“: okno pak přiblíží kameru na obsah. */
  fit: number;
}

const states = new WeakMap<Session, View3DState>();

/** Odkaz s `&3d` otevře 3D okno hned po načtení (např. `?ukazka=dum&3d`). */
const openFromUrl = () => typeof location !== 'undefined' && new URLSearchParams(location.search).has('3d');

export function view3d(s: Session): View3DState {
  let st = states.get(s);
  if (!st) {
    st = { open: openFromUrl(), only: null, fit: 0 };
    states.set(s, st);
  }
  return st;
}

/**
 * Otevře 3D okno vedle půdorysu. `selection` = Zobrazit výběr ve 3D (F4): jen vybrané stěny, desky a hostitelé
 * vybraných otvorů; bez výběru ukáže vše (jako Archicad).
 */
export function show3D(s: Session, selection: boolean) {
  const st = view3d(s);
  const ids = selection
    ? [...selectionElements(s.model, s.selection.walls, s.selection.openings, s.selection.slabs)]
    : [];
  st.open = true;
  st.only = ids.length ? ids : null;
  st.fit++;
  s.changed();
}

export function close3D(s: Session) {
  view3d(s).open = false;
  s.changed();
}
