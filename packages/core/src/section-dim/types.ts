// Délková kóta v řezu a pohledu (hlášení uživatele 2026-11-27: kóta v okně řezu nešla vložit; Revit / Archicad
// kótují v řezu běžně). Anotace řezu, asociativní k modelu: svislá kóta mezi úrovněmi (podlaží, horní / spodní
// hrana stěny nebo desky – jako výšková kóta), vodorovná mezi boky prvků v řezu (levý / pravý okraj stěny
// nebo desky na výkrese). Po změně modelu se přepočítá. Uložená je jen poloha kótovací čáry.
import type { Id } from '../ids/index.ts';
import type { LevelRef } from '../level-dim/types.ts';

/** Bok prvku na výkrese řezu: levý (u0) nebo pravý (u1) okraj stěny / desky. */
export interface SideRef {
  readonly kind: 'side';
  readonly elementId: Id;
  readonly side: 'left' | 'right';
}

export type SectionDimRef = LevelRef | SideRef;

export interface SectionDimension {
  readonly id: Id;
  readonly sectionId: Id;
  /** Svislá (výšky) nebo vodorovná (šířky po výkrese). */
  readonly orientation: 'vertical' | 'horizontal';
  readonly a: SectionDimRef;
  readonly b: SectionDimRef;
  /** Poloha kótovací čáry: u svislé u (mm po výkrese), u vodorovné z (mm nad ±0,000). */
  readonly offset: number;
  readonly annotationLayerId: Id;
  readonly locked: boolean;
}

export const isSideRef = (r: SectionDimRef): r is SideRef => r.kind === 'side';
