// Výšková kóta v řezu a pohledu (ČSN 01 3420; Revit „Spot Elevation“, Archicad „Level Dimension“): anotace
// řezu, asociativní k modelu – odkazuje na úroveň podlaží nebo horní / spodní hranu prvku, ne na souřadnici,
// takže se po změně výšky přepočítá. Má skupinu anotací a zámek (základ 28). Uložená je jen poloha praporku.
import type { Id } from '../ids/index.ts';

/** Na co kóta ukazuje: úroveň podlaží, nebo horní / spodní hrana prvku (stěna, deska). */
export type LevelRef =
  | { readonly kind: 'storey'; readonly storeyId: Id }
  | { readonly kind: 'edge'; readonly elementId: Id; readonly edge: 'top' | 'bottom' };

export interface LevelDimension {
  readonly id: Id;
  /** Řez nebo pohled, ve kterém kóta je. */
  readonly sectionId: Id;
  readonly ref: LevelRef;
  /** Poloha praporku po výkrese řezu (u v mm od levého okraje). */
  readonly at: number;
  /** Praporek pod kótovanou hranou (kóta spodní hrany, ČSN 01 3420); jinak nad ní. */
  readonly below: boolean;
  /** Absolutní kóta (nadmořská výška Bpv, plný trojúhelník); jinak relativní k ±0,000. */
  readonly absolute: boolean;
  readonly annotationLayerId: Id;
  /** Zamčená kóta se nedá posunout ani změnit (smazat jde). */
  readonly locked: boolean;
}
