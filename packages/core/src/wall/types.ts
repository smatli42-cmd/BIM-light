// Stěna a typ stěny (základy 10, 12, 23). IFC: IfcWall, IfcMaterialLayerSet(Usage).
import type { Path } from '../geometry/index.ts';
import type { ElementBase } from '../model/types.ts';
export type { HeightBand, LayerFunction, WallLayer, WallType } from '../wall-type/types.ts';
import type { HeightBinding } from '../model/height.ts';
import type { TopProfile } from '../wall-height/top-profile.ts';

/**
 * Referenční čára: líc na straně první vrstvy (výchozí, „uvnitř“), osa („uprostřed“), protilehlý líc
 * na straně poslední vrstvy („vně“, rozhraní UI2), líc jádra.
 */
export type ReferenceLine = 'face' | 'axis' | 'opp-face' | 'core-face';

/** Všechny referenční čáry (popis parametrů příkazů). */
export const REFERENCE_LINES: readonly ReferenceLine[] = ['face', 'axis', 'opp-face', 'core-face'];

/** Strana tloušťky vůči směru kreslení (výchozí doleva, část 1 katalogu kreslení). */
export type WallSide = 'left' | 'right';

/** Instance stěny. `path` je referenční čára (úsečka nebo oblouk). */
export interface Wall extends ElementBase {
  readonly category: 'wall';
  readonly path: Path;
  readonly referenceLine: ReferenceLine;
  readonly side: WallSide;
  readonly height: HeightBinding;
  /** Horní profil (plán stěn Z3): zatím vždy rovný. */
  readonly topProfile: TopProfile;
}

/** Líc stěny pro kóty a přichytávání: referenční strana, protilehlá strana, osa. */
export type WallFace = 'ref' | 'opp' | 'axis';
