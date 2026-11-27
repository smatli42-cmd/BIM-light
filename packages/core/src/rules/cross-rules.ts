// Průřezová pravidla na jednom místě (základ 7): tabulka „pravidlo × typ prvku“.
// Kóty, zámky, přichytávání, posuny, mazání a hostitelé se řídí touto tabulkou, ne kódem v prvcích.
// Nový typ prvku = nový řádek tabulky.
import type { WallEdge } from '../wall/edges.ts';

export type ElementKind = 'wall' | 'slab' | 'opening' | 'dimension' | 'tag';

/** Druhy bodů a čar pro přichytávání (katalog kreslení, část 2, pořadí priorit). */
export type SnapKind = 'endpoint' | 'intersection' | 'midpoint' | 'center' | 'quadrant' | 'face' | 'axis';

/** Co se při smazání prvku smaže s ním. */
export type DeleteCascade = 'dimensions' | 'connections' | 'openings' | 'tags';

export interface CrossRules {
  /** Na co jde navázat kóta (líce, osa, čela volných konců). */
  readonly dimensionFaces: readonly WallEdge[];
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
  /** Co může tento prvek hostit (napojení konce, otvory). */
  readonly hosts: readonly ElementKind[];
  /** Lze vybrat ve výkresu (pokud vrstva není zamčená). */
  readonly selectable: boolean;
}

export const CROSS_RULES: Readonly<Record<ElementKind, CrossRules>> = {
  wall: {
    dimensionFaces: ['ref', 'opp', 'axis', 'start', 'end'],
    lengthDimension: true,
    angularDimension: true,
    lockable: true,
    snaps: ['endpoint', 'intersection', 'midpoint', 'center', 'quadrant', 'face', 'axis'],
    movable: true,
    offsettable: true,
    deletable: true,
    onDelete: ['dimensions', 'connections', 'openings', 'tags'],
    hosts: ['wall', 'opening'],
    selectable: true,
  },
  /** Deska (D1): kóty k hranám a otvory v desce přijdou s D2 / D3; přichytí se na rohy a středy hran. */
  slab: {
    dimensionFaces: [],
    lengthDimension: false,
    angularDimension: false,
    lockable: false,
    snaps: ['endpoint', 'midpoint'],
    movable: true,
    offsettable: false,
    deletable: true,
    onDelete: [],
    hosts: ['opening'],
    selectable: true,
  },
  opening: {
    dimensionFaces: ['start', 'end'],
    lengthDimension: false,
    angularDimension: false,
    lockable: true,
    snaps: ['endpoint', 'midpoint'],
    movable: true,
    offsettable: false,
    deletable: true,
    onDelete: ['dimensions'],
    hosts: [],
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
  /** Značka typu stěny (Z8): jde se stěnou (poloha je vázaná na stěnu), maže se příkazem. */
  tag: {
    dimensionFaces: [],
    lengthDimension: false,
    angularDimension: false,
    lockable: false,
    snaps: [],
    movable: false,
    offsettable: false,
    deletable: true,
    onDelete: [],
    hosts: [],
    selectable: false,
  },
};

export const rulesFor = (kind: ElementKind): CrossRules => CROSS_RULES[kind];
