// Kategorie (funkce) místnosti (Archicad Zone Category): název, barva výplně v půdorysu a druh plochy
// podle ČSN 73 4301 (obytná / užitková). Kategorie jsou data projektu; výchozí knihovna je vymyšlená a jde
// upravit. Barva kategorie vstupuje do funkce grafiky jako výchozí grafika místnosti (patro 1), takže ji
// přebije styl, pravidlo i přepis prvku (základ 11).
import type { Id } from '../ids/index.ts';

/** Druh plochy: obytná (pokoje), nebo užitková (vše ostatní). */
export type RoomAreaKind = 'living' | 'utility';
export const ROOM_AREA_KINDS: readonly RoomAreaKind[] = ['living', 'utility'];

export interface RoomCategory {
  readonly id: Id;
  readonly name: string;
  /** Barva výplně místnosti v půdorysu (#rrggbb). */
  readonly color: string;
  readonly areaKind: RoomAreaKind;
}

/** Výchozí kategorie nového projektu (vymyšlené barvy; id stabilní kvůli migraci a pravidlům). */
export const ROOM_CATEGORY_LIBRARY: readonly RoomCategory[] = [
  { id: 'room-cat-living', name: 'Obytné', color: '#f6e3b4', areaKind: 'living' },
  { id: 'room-cat-hygiene', name: 'Hygienické', color: '#c9e4f2', areaKind: 'utility' },
  { id: 'room-cat-circulation', name: 'Komunikace', color: '#e3e3e3', areaKind: 'utility' },
  { id: 'room-cat-kitchen', name: 'Kuchyně a stravování', color: '#f9d2c0', areaKind: 'utility' },
  { id: 'room-cat-storage', name: 'Skladové', color: '#dcd3e8', areaKind: 'utility' },
  { id: 'room-cat-technical', name: 'Technické', color: '#d5e8cf', areaKind: 'utility' },
];

export const defaultRoomCategories = (): Record<Id, RoomCategory> =>
  Object.fromEntries(ROOM_CATEGORY_LIBRARY.map((c) => [c.id, c]));
