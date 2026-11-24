// Stěna a typ stěny (základy 10, 12, 23). IFC: IfcWall, IfcMaterialLayerSet(Usage).
import type { Id } from '../ids/index.ts';
import type { Path } from '../geometry/index.ts';
import type { ElementBase, LibraryRef } from '../model/types.ts';
import type { HeightBinding } from '../model/height.ts';

/** Funkce vrstvy: jádro / izolace / povrch. */
export type LayerFunction = 'core' | 'insulation' | 'finish';

/** Vrstva = materiál + tloušťka (mm) + funkce. */
export interface WallLayer {
  readonly materialId: Id;
  readonly thickness: number;
  readonly function: LayerFunction;
}

/**
 * Výškový pás typu stěny (základ 10): od spodku stěny nahoru, `height` mm vysoký,
 * `null` = až do vršku stěny. Vrstvy jsou seřazené od referenční strany ke straně tloušťky.
 */
export interface HeightBand {
  readonly height: number | null;
  readonly layers: readonly WallLayer[];
}

/** Typ stěny = seznam výškových pásů (první verze má jeden pás). */
export interface WallType {
  readonly id: Id;
  readonly name: string;
  readonly bands: readonly HeightBand[];
  readonly source?: LibraryRef;
}

/** Referenční čára: líc (výchozí, vnitřní líc), osa, líc jádra. */
export type ReferenceLine = 'face' | 'axis' | 'core-face';

/** Strana tloušťky vůči směru kreslení (výchozí doleva, část 1 katalogu kreslení). */
export type WallSide = 'left' | 'right';

/** Instance stěny. `path` je referenční čára (úsečka nebo oblouk). */
export interface Wall extends ElementBase {
  readonly category: 'wall';
  readonly path: Path;
  readonly referenceLine: ReferenceLine;
  readonly side: WallSide;
  readonly height: HeightBinding;
}

/** Líc stěny pro kóty a přichytávání: referenční strana, protilehlá strana, osa. */
export type WallFace = 'ref' | 'opp' | 'axis';
