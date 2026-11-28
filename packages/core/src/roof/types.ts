// Střecha (rozhodnutí 11, schválený návrh S1 2026-11-28): vícerovinná střecha jako v Archicadu.
// Uložený je jen obrys referenční čáry a u každé hrany sklon / štít a přesah; roviny, hřebeny, nároží
// a úžlabí se vždy počítají (roof/skeleton.ts). Referenční rovina = spodní líc nosné vrstvy skladby
// (krokve s izolací), referenční čára = obrys střechy v této rovině (typicky vnější líc zdi = pozednice).
// IFC: IfcRoof (export až S3).
import type { Vec2 } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import type { ElementBase, LibraryRef } from '../model/types.ts';

/** Druh hrany obrysu: sklon (okap, rovina stoupá dovnitř) nebo štít (svislá rovina). */
export type RoofEdgeKind = 'slope' | 'gable';
export const ROOF_EDGE_KINDS: readonly RoofEdgeKind[] = ['slope', 'gable'];

/** Hrana obrysu `outline[i] → outline[i+1]`. */
export interface RoofEdge {
  readonly kind: RoofEdgeKind;
  /** Sklon roviny ve stupních (jen `slope`; u štítu se pamatuje pro přepnutí zpět). */
  readonly slope: number;
  /** Přesah vodorovně za referenční čáru (mm), u štítu přesah štítu. */
  readonly overhang: number;
}

/** Úhel řezu okapu (Ardit „Úhel okapu“): svisle, kolmo k rovině, vodorovně. */
export type EaveCut = 'vertical' | 'perpendicular' | 'horizontal';
export const EAVE_CUTS: readonly EaveCut[] = ['vertical', 'perpendicular', 'horizontal'];

/** Instance střechy. */
export interface Roof extends ElementBase {
  readonly category: 'roof';
  /** Obrys referenční čáry proti směru hodin, bez opakování prvního bodu. */
  readonly outline: readonly Vec2[];
  /** Hrany obrysu, `edges[i]` = úsečka `outline[i] → outline[i+1]`. */
  readonly edges: readonly RoofEdge[];
  /** Výška referenční čáry nad úrovní podlaží (mm, základ 12). */
  readonly refOffset: number;
  readonly eaveCut: EaveCut;
}

/** Typ střechy: skladba (sdílená, „použít pro střechu“) + značka. Vrstvy skladby odspodu nahoru. */
export interface RoofType {
  readonly id: Id;
  readonly name: string;
  /** Značka typu, např. „R1“. */
  readonly mark: string;
  readonly compositionId: Id;
  readonly source?: LibraryRef;
}

/** Předvolby tvaru (jen předvyplní hrany): pultová, sedlová, valbová. */
export type RoofShape = 'shed' | 'gable' | 'hip';
export const ROOF_SHAPES: readonly RoofShape[] = ['shed', 'gable', 'hip'];

export const DEFAULT_ROOF_SLOPE = 35;
export const DEFAULT_ROOF_OVERHANG = 500;
/** Výchozí výška referenční čáry nad podlahou (Ardit 3000 = konstrukční výška podlaží). */
export const DEFAULT_ROOF_REF = 3000;
/** Rozsah sklonu (°): pod 1° by hřeben utekl do nekonečna, nad 85° je to stěna. */
export const MIN_ROOF_SLOPE = 1;
export const MAX_ROOF_SLOPE = 85;
