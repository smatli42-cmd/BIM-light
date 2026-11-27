// Deska (strop a podlaha, rozhodnutí sekce 5: dvě samostatné desky – nosný strop + skladba podlahy).
// Obrys je uzavřený mnohoúhelník v půdorysu (mm); referenční rovina je HORNÍ líc desky (jako Revit
// „Floor“ a výchozí Archicad), tloušťka jde dolů. IFC: IfcSlab (strop) / IfcCovering FLOORING (podlaha).
import type { Vec2 } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import type { ElementBase, LibraryRef } from '../model/types.ts';

/** Funkce desky: nosná deska (strop, základová deska) nebo skladba podlahy. */
export type SlabFunction = 'structure' | 'floor';
export const SLAB_FUNCTIONS: readonly SlabFunction[] = ['structure', 'floor'];

/**
 * Vazba obrysu desky na model (základy 14, 16, 24): podlaha patří místnosti (obrys = obrys místnosti
 * od líce k líci i s ostrovy), deska „podle stěn“ nese stěny smyčky a hranici (líc / líc jádra).
 * Obrys se po každém příkazu přepočítá z modelu; ruční úprava obrysu vazbu zamkne (`locked`).
 */
export type SlabLink =
  | { readonly kind: 'room'; readonly roomId: Id; readonly locked?: boolean }
  | {
      readonly kind: 'walls';
      readonly wallIds: readonly Id[];
      readonly boundary: 'face' | 'core';
      readonly locked?: boolean;
    };

/** Instance desky. */
export interface Slab extends ElementBase {
  readonly category: 'slab';
  readonly slabFunction: SlabFunction;
  /** Obrys: body mnohoúhelníku proti směru hodinových ručiček, bez opakování prvního bodu. */
  readonly outline: readonly Vec2[];
  /** Ostrovy uvnitř obrysu (sloup, komín v místnosti) – deska v nich není; jen u vazby na místnost. */
  readonly holes?: readonly (readonly Vec2[])[];
  /** Vazba obrysu (bez ní = ruční obrys). */
  readonly link?: SlabLink;
  /** Horní líc desky nad úrovní podlaží (mm, záporně = pod). Úroveň podlaží = čistá podlaha. */
  readonly topOffset: number;
}

/** Typ desky: skladba (sdílená se stěnami a střechami, koncepce rozhraní 11a) + značka. */
export interface SlabType {
  readonly id: Id;
  readonly name: string;
  /** Značka typu, např. „D1“ (strop) nebo „P1“ (podlaha). */
  readonly mark: string;
  /** Výchozí funkce nové desky tohoto typu. */
  readonly slabFunction: SlabFunction;
  /** Skladba; vrstvy od SPODNÍ strany nahoru. */
  readonly compositionId: Id;
  readonly loadBearing: boolean;
  readonly source?: LibraryRef;
}

/** Nejmenší plocha desky (mm²) – menší obrys je chyba (např. tři body v řadě). */
export const MIN_SLAB_AREA = 1000;

/** Výchozí tloušťka skladby podlahy nad nosnou deskou (mm): horní líc nové nosné desky = −150. */
export const DEFAULT_FLOOR_BUILDUP = 150;

/** Výchozí horní líc nové desky: podlaha 0 (= úroveň podlaží), nosná deska −150 (pod skladbou podlahy). */
export const defaultTopOffset = (f: SlabFunction): number => (f === 'floor' ? 0 : -DEFAULT_FLOOR_BUILDUP);
