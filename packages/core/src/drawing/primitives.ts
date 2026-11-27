// Kresba, kterou jádro vrací (základy 4, 11, 32): seznam primitiv v mm modelu.
// Čáry nesou jen číslo pera (tloušťku v mm určí až tabulka per a měřítko při vykreslení).
// Texty a šrafy mají velikost v mm na papíře (základ 29). Jádro nezná canvas.
import type { Hatch } from '../hatch/types.ts';
import type { Vec2 } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import type { LineType } from '../style/types.ts';

export interface Stroke {
  readonly pen: number;
  readonly color: string;
  readonly lineType: LineType;
}

/** Odkud primitivum pochází (pro výběr a „proč to vypadá takhle“). */
export interface PrimitiveSource {
  readonly elementId?: Id;
  readonly dimensionId?: Id;
  /** Role: obrys, vrstva, šrafa, kótovací čára, odkazová čára, číslo kóty… */
  readonly role: string;
}

export type Primitive =
  | {
      readonly kind: 'line';
      readonly points: readonly Vec2[];
      readonly closed: boolean;
      readonly stroke: Stroke;
      readonly source: PrimitiveSource;
    }
  | {
      readonly kind: 'fill';
      readonly polygon: readonly Vec2[];
      readonly color: string;
      readonly transparency: number;
      readonly source: PrimitiveSource;
    }
  | {
      readonly kind: 'hatch';
      readonly polygon: readonly Vec2[];
      /** Definice šrafy (tvar, mm na papíře); primitivum je soběstačné i pro DXF / PDF. */
      readonly hatch: Hatch;
      readonly pen: number;
      readonly lineColor: string;
      /** Výplň pod šrafou; null = bez výplně. */
      readonly fillColor: string | null;
      /** Počátek rastru v souřadnicích modelu (společný pro celý výkres). */
      readonly origin: Vec2;
      /** Křivky pásu přes šířku vrstvy (rodina „band“) v souřadnicích modelu; kresba je jen ořízne. */
      readonly curves?: readonly (readonly Vec2[])[];
      readonly source: PrimitiveSource;
    }
  | {
      readonly kind: 'text';
      readonly at: Vec2;
      readonly text: string;
      /** Výška písma na papíře (mm), stejná ve všech měřítcích. */
      readonly heightMm: number;
      /** Natočení v radiánech (vždy čitelné zdola nebo zprava). */
      readonly angle: number;
      /** Tučně (číslo místnosti). */
      readonly bold?: boolean;
      readonly color: string;
      readonly source: PrimitiveSource;
    };

/** Kresba pohledu: primitiva + měřítko, se kterým byla spočítána. */
export interface Drawing {
  readonly scale: number;
  readonly primitives: readonly Primitive[];
}
