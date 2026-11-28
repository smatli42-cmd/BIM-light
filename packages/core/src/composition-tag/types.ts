// Popis skladby v řezu a pohledu (česká výkresová praxe, ČSN 01 3420; Revit Multi-layer tag, Archicad
// Composite label): odkazová čára protne řezanou stěnu nebo desku kolmo (deska svisle, stěna vodorovně),
// může se lomit, na konci kolečko s číslem konstrukce (značka typu) a pod ním vrstvy skladby v pořadí –
// každý řádek s čárkou od svislé čáry. Anotace řezu (skupina anotací, zámek), ne data prvku. Uložená je jen
// vazba (řez, prvek, bod uchycení poměrem na prvku), body čáry a volby obsahu – text se vždy počítá z typu
// prvku (základ 4), změna skladby ho hned přepíše.
import type { Vec2 } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';

/** Bod uchycení na řezaném prvku: poměr po šířce (0 = levý okraj na výkrese) a po výšce (0 = spodek). */
export interface TagAnchor {
  readonly s: number;
  readonly t: number;
}

/** Na kterou stranu svislé čáry jdou řádky vrstev. */
export type CompositionTagSide = 'left' | 'right';
export const COMPOSITION_TAG_SIDES: readonly CompositionTagSide[] = ['left', 'right'];

/** Zarovnání řádků v bloku textu (čárka od svislé čáry dosáhne vždy k textu). */
export type CompositionTagAlign = 'left' | 'center' | 'right';
export const COMPOSITION_TAG_ALIGNS: readonly CompositionTagAlign[] = ['left', 'center', 'right'];

export interface CompositionTagOptions {
  /** Kolečko s číslem konstrukce (značka typu, např. „P2“, „S1“) na konci odkazové čáry. */
  readonly mark: boolean;
  /** První řádek: název typu s celkovou tloušťkou. */
  readonly title: boolean;
  /** Tloušťka vrstvy („tl. 20 mm“) za názvem materiálu. */
  readonly thickness: boolean;
  /** Čísla vrstev („1. …“). */
  readonly numbered: boolean;
  /** Obrácené pořadí: deska zdola nahoru, stěna od druhé strany. */
  readonly reverse: boolean;
  /** Řádky vpravo, nebo vlevo od svislé čáry. */
  readonly side: CompositionTagSide;
  /** Zarovnání řádků vlevo, na střed, vpravo. */
  readonly align: CompositionTagAlign;
}

export interface CompositionTag extends CompositionTagOptions {
  readonly id: Id;
  readonly sectionId: Id;
  readonly elementId: Id;
  readonly anchor: TagAnchor;
  /**
   * Body odkazové čáry za bodem uchycení, vůči němu (mm výkresu; pohnou se s prvkem). První úsek je vždy
   * kolmo ke konstrukci, další body lomí čáru; poslední = kolečko, pod ním řádky vrstev.
   */
  readonly leader: readonly Vec2[];
  readonly annotationLayerId: Id;
  readonly locked: boolean;
}

/** Výchozí obsah nového popisu (vzor české výkresové praxe: číslo v kolečku, materiál + tloušťka). */
export const TAG_DEFAULTS: CompositionTagOptions = {
  mark: true,
  title: false,
  thickness: true,
  numbered: false,
  reverse: false,
  side: 'right',
  align: 'left',
};
