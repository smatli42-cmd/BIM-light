// Značka typu stěny v půdorysu (plán stěn Z8; Wall Tag v Revitu, popisek v Archicadu).
// Popisek patří podlaží a má skupinu anotací (základ 28); je navázaný na stěnu, ne na souřadnice
// (základ 4), takže jde se stěnou. Text = značka typu (S1…), velikost pevná na papíře (základ 29).
import type { Id } from '../ids/index.ts';

/** Strana stěny: u referenčního líce, u protilehlého líce, nebo na ose (přes stěnu). */
export type TagSide = 'ref' | 'opp' | 'on';
export const TAG_SIDES: readonly TagSide[] = ['ref', 'opp', 'on'];

export interface WallTag {
  readonly id: Id;
  readonly storeyId: Id;
  readonly annotationLayerId: Id;
  readonly wallId: Id;
  /** Poloha podél stěny 0..1 (0,5 = uprostřed). */
  readonly position: number;
  readonly side: TagSide;
}
