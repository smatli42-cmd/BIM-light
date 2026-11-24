// Průřezová pravidla na jednom místě (základ 7): tabulka „pravidlo × typ prvku“.
// Kóty, zámky, přichytávání, posuny, mazání a hostitelé se řídí touto tabulkou, ne kódem v prvcích.
// Nový typ prvku = nový řádek tabulky.
import type { WallFace } from '../wall/types.ts';

export type ElementKind = 'wall' | 'dimension';

/** Druhy bodů a čar pro přichytávání (katalog kreslení, část 2, pořadí priorit). */
export type SnapKind = 'endpoint' | 'intersection' | 'midpoint' | 'face' | 'axis';

/** Co se při smazání prvku smaže s ním. */
export type DeleteCascade = 'dimensions' | 'connections';

export interface CrossRules {
  /** Na co jde navázat kóta (líce). */
  readonly dimensionFaces: readonly WallFace[];
  /** Může mít délkovou kótu. */
  readonly lengthDimension: boolean;
  /** Může mít úhlovou kótu. */
  readonly angularDimension: boolean;
  /** Může být držen zamčenou kótou (zámek je omezení modelu). */
  readonly lockable: boolean;
  /** Body a čáry pro přichytávání v pořadí priority. */
  readonly snaps: readonly SnapKind[];
  /** Jde posunout / otočit / zrcadlit příkazem. */
  readonly movable: boolean;
  /** Jde odsadit kolmo. */
  readonly offsettable: boolean;
  readonly deletable: boolean;
  readonly onDelete: readonly DeleteCascade[];
  /** Co může tento prvek hostit (napojení konce, později otvory). */
  readonly hosts: readonly ElementKind[];
  /** Lze vybrat ve výkresu (pokud vrstva není zamčená). */
  readonly selectable: boolean;
}

export const CROSS_RULES: Readonly<Record<ElementKind, CrossRules>> = {
  wall: {
    dimensionFaces: ['ref', 'opp', 'axis'],
    lengthDimension: true,
    angularDimension: true,
    lockable: true,
    snaps: ['endpoint', 'intersection', 'midpoint', 'face', 'axis'],
    movable: true,
    offsettable: true,
    deletable: true,
    onDelete: ['dimensions', 'connections'],
    hosts: ['wall'],
    selectable: true,
  },
  dimension: {
    dimensionFaces: [],
    lengthDimension: false,
    angularDimension: false,
    lockable: false,
    snaps: [],
    movable: true,
    offsettable: true,
    deletable: true,
    onDelete: [],
    hosts: [],
    selectable: true,
  },
};

export const rulesFor = (kind: ElementKind): CrossRules => CROSS_RULES[kind];
