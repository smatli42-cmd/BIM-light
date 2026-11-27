// Stav 3D okna (koncepce rozhraní, část 2 E a G, řádek 10). Okno ukazuje uložený 3D pohled z modelu
// (View3d: styl, filtr, vrstvy, rozsah podlaží, ořezový kvádr – mění se příkazy view3d.*, jdou přes AI
// i Undo). Volba obrazovky (jako rozvržení oken) je jen: otevřené / zavřené, který 3D pohled a dočasné
// „jen výběr“ (Zobrazit výběr ve 3D, F4). Drží se vedle Session, aby se Session neměnila.
import type { Id, View3d } from '@bim-light/core';
import type { Box3D } from './clip.ts';
import type { Session } from '../session/session.ts';
import { selectionElements } from './scene-model.ts';

export interface View3DState {
  open: boolean;
  /** Jen tyto prvky (výběr ve 3D); null = celý model. */
  only: Id[] | null;
  /** Zvýší se při každém „zobrazit“: okno pak přiblíží kameru na obsah. */
  fit: number;
  /** Zobrazený 3D pohled; null nebo smazaný = první v projektu. */
  viewId: Id | null;
}

const states = new WeakMap<Session, View3DState>();

/** Odkaz s `&3d` otevře 3D okno hned po načtení (např. `?ukazka=dum&3d`). */
const openFromUrl = () => typeof location !== 'undefined' && new URLSearchParams(location.search).has('3d');

export function view3d(s: Session): View3DState {
  let st = states.get(s);
  if (!st) {
    st = { open: openFromUrl(), only: null, fit: 0, viewId: null };
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

/** 3D pohled, který okno ukazuje (vybraný, jinak první v projektu – projekt má vždy aspoň jeden). */
export function active3d(s: Session): View3d {
  const id = view3d(s).viewId;
  const v = (id && s.model.views3d[id]) || Object.values(s.model.views3d)[0];
  if (!v) throw new Error('Projekt nemá 3D pohled');
  return v;
}

export function pick3d(s: Session, viewId: Id) {
  view3d(s).viewId = viewId;
  view3d(s).fit++;
  s.changed();
}

/** Rozsah podlaží 3D pohledu (příkaz view3d.setStoreys); null nebo všechna = vše. */
export function setStoreys3D(s: Session, ids: readonly Id[] | null) {
  const all = Object.keys(s.model.storeys);
  const storeyIds = ids && ids.length < all.length ? [...ids] : null;
  s.run('view3d.setStoreys', { viewId: active3d(s).id, storeyIds });
}

/** Ořezový kvádr 3D pohledu (příkaz view3d.setSectionBox); null = vypnout. */
export function setBox3D(s: Session, box: Box3D | null) {
  s.run('view3d.setSectionBox', { viewId: active3d(s).id, sectionBox: box });
}
