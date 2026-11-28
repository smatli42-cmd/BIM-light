// Popis skladby v řezu a pohledu (ČSN 01 3420 odkazový popis; Revit Material Tag / Multi-layer tag, Archicad
// Composite label): odkazová čára od řezané stěny nebo desky k textu vrstev skladby v pořadí (materiál +
// tloušťka; deska shora dolů, stěna od referenční strany). Anotace řezu (skupina anotací, zámek), ne data
// prvku. Uložená je jen vazba (řez, prvek, bod uchycení poměrem na prvku), poloha textu a volby obsahu –
// text se vždy počítá z typu prvku (základ 4), změna skladby ho hned přepíše.
import type { Vec2 } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';

/** Bod uchycení na řezaném prvku: poměr po šířce (0 = levý okraj na výkrese) a po výšce (0 = spodek). */
export interface TagAnchor {
  readonly s: number;
  readonly t: number;
}

export interface CompositionTagOptions {
  /** Čísla vrstev („1. …“); jinak pomlčka. */
  readonly numbered: boolean;
  /** Tloušťka vrstvy v mm za názvem materiálu. */
  readonly thickness: boolean;
  /** První řádek: značka a název typu s celkovou tloušťkou. */
  readonly title: boolean;
  /** Obrácené pořadí: deska zdola nahoru, stěna od druhé strany. */
  readonly reverse: boolean;
}

export interface CompositionTag extends CompositionTagOptions {
  readonly id: Id;
  readonly sectionId: Id;
  readonly elementId: Id;
  readonly anchor: TagAnchor;
  /** Začátek poličky (první řádek textu) vůči bodu uchycení, mm modelu na výkrese (pohne se s prvkem). */
  readonly offset: Vec2;
  readonly annotationLayerId: Id;
  readonly locked: boolean;
}

/** Výchozí obsah nového popisu (Revit Multi-layer tag: materiál + tloušťka; ČSN: odrážky). */
export const TAG_DEFAULTS: CompositionTagOptions = {
  numbered: false,
  thickness: true,
  title: true,
  reverse: false,
};
