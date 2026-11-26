// Typ stěny a skladba (základy 10, 21; plán stěn Z1). IFC: IfcMaterialLayerSet.
// Vrstvy jsou seřazené od referenční strany ke straně tloušťky; tloušťka typu = součet vrstev.
import type { Id } from '../ids/index.ts';
import type { LibraryRef } from '../model/types.ts';
import type { WallProperties } from '../wall-props/types.ts';

/** Funkce vrstvy: jádro / izolace / povrch. */
export type LayerFunction = 'core' | 'insulation' | 'finish';
export const LAYER_FUNCTIONS: readonly LayerFunction[] = ['core', 'insulation', 'finish'];

/** Vrstva = materiál + tloušťka (mm) + funkce + prodloužení nahoře a dole (mm, využije krok Z3). */
export interface WallLayer {
  readonly materialId: Id;
  readonly thickness: number;
  readonly function: LayerFunction;
  readonly extendTop: number;
  readonly extendBottom: number;
}

/**
 * Výškový pás typu stěny (základ 10): od spodku stěny nahoru, `height` mm vysoký,
 * `null` = až do vršku stěny (poslední pás). Pás tedy leží „od“ součtu předchozích „do“ +height.
 */
export interface HeightBand {
  readonly height: number | null;
  readonly layers: readonly WallLayer[];
}

/** Typ stěny = seznam výškových pásů (editor zatím jeden pás). */
export interface WallType {
  readonly id: Id;
  readonly name: string;
  readonly bands: readonly HeightBand[];
  /** Vlastnosti typu (plán stěn Z7): funkce, nosná, vnější, požár, akustika. */
  readonly properties: WallProperties;
  /** Původ v knihovně typů (základ 21); kopie vytvořená v projektu ho nemá. */
  readonly source?: LibraryRef;
}
