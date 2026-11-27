// Stav 3D okna (koncepce rozhraní, část 2 E a G, řádek 10): otevřené / zavřené a co ukazuje – celý model
// (Zobrazit vše ve 3D, Ctrl+F4) nebo jen výběr (Zobrazit výběr ve 3D, F4). Volba obrazovky, ne data modelu,
// proto nejde přes příkaz (jako rozvržení oken). Drží se vedle Session, aby se Session neměnila.
import type { Id } from '@bim-light/core';
import type { Box3D } from './clip.ts';
import type { Session } from '../session/session.ts';
import { selectionElements } from './scene-model.ts';

export interface View3DState {
  open: boolean;
  /** Jen tyto prvky (výběr ve 3D); null = celý model. */
  only: Id[] | null;
  /** Zvýší se při každém „zobrazit“: okno pak přiblíží kameru na obsah. */
  fit: number;
  /** Rozsah podlaží (jako Filter and Cut Elements in 3D v Archicadu); null = všechna. */
  storeys: Id[] | null;
  /** Ořezový kvádr (Section Box v Revitu, mm); null = vypnutý. */
  box: Box3D | null;
}

const states = new WeakMap<Session, View3DState>();

/** Odkaz s `&3d` otevře 3D okno hned po načtení (např. `?ukazka=dum&3d`). */
const openFromUrl = () => typeof location !== 'undefined' && new URLSearchParams(location.search).has('3d');

export function view3d(s: Session): View3DState {
  let st = states.get(s);
  if (!st) {
    st = { open: openFromUrl(), only: null, fit: 0, storeys: null, box: null };
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
    ? [
        ...selectionElements(
          s.model,
          s.selection.walls,
          s.selection.openings,
          s.selection.slabs,
          s.selection.slabOpenings,
        ),
      ]
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

/** Rozsah podlaží ve 3D; null nebo všechna = vše. */
export function setStoreys3D(s: Session, ids: readonly Id[] | null) {
  const all = Object.keys(s.model.storeys);
  view3d(s).storeys = ids && ids.length < all.length ? [...ids] : null;
  s.changed();
}

/** Zapne ořezový kvádr (na `box`, typicky obal zobrazeného modelu) nebo ho vypne (null). */
export function setBox3D(s: Session, box: Box3D | null) {
  view3d(s).box = box;
  s.changed();
}
