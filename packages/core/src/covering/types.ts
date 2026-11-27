// Úprava povrchu (prvky stavby 9, základ 14; IFC IfcCovering): typ úpravy (malba, omítka, obklad, dlažba,
// podlahovina, podhled, sokl) s materiálem projektu a u obkladu a dlažby s formátem, spárou a zarovnáním.
// Přiřazení je logické: místnost + stěna + strana + výšková zóna, nebo místnost + podlaha / strop.
// Plochy se nikdy neukládají, vždy se počítají z modelu (`surfaces.ts`, základ 4).
import type { Id } from '../ids/index.ts';
import type { LibraryRef } from '../model/types.ts';

export const COVERING_KINDS = [
  'paint',
  'plaster',
  'tiling',
  'floor-tiles',
  'flooring',
  'ceiling',
  'skirting',
] as const;
export type CoveringKind = (typeof COVERING_KINDS)[number];

export const COVERING_KIND_LABELS: Readonly<Record<CoveringKind, string>> = {
  paint: 'malba',
  plaster: 'omítka',
  tiling: 'obklad',
  'floor-tiles': 'dlažba',
  flooring: 'podlahovina',
  ceiling: 'podhled',
  skirting: 'sokl',
};

/** IfcCoveringTypeEnum podle druhu (export IFC později). */
export const COVERING_IFC_TYPE: Readonly<Record<CoveringKind, string>> = {
  paint: 'CLADDING',
  plaster: 'CLADDING',
  tiling: 'CLADDING',
  'floor-tiles': 'FLOORING',
  flooring: 'FLOORING',
  ceiling: 'CEILING',
  skirting: 'SKIRTINGBOARD',
};

/** Druhy s formátem dlaždic (spárořez). */
export const TILED_KINDS: readonly CoveringKind[] = ['tiling', 'floor-tiles', 'skirting'];

/** Zarovnání spárořezu: od rohu, na střed plochy, na osu spáry ve středu. */
export const TILE_ALIGNS = ['corner', 'center', 'axis'] as const;
export type TileAlign = (typeof TILE_ALIGNS)[number];

/** Formát obkladu / dlažby (zatím jen uložený; spárořez je další krok). */
export interface TileFormat {
  /** Šířka a výška dlaždice (mm). */
  readonly width: number;
  readonly height: number;
  /** Šířka spáry (mm). */
  readonly joint: number;
  readonly jointColor: string;
  readonly align: TileAlign;
}

export interface CoveringType {
  readonly id: Id;
  readonly name: string;
  readonly kind: CoveringKind;
  /** Materiál projektu (barva ve 3D); null = bez materiálu. */
  readonly materialId: Id | null;
  readonly tile?: TileFormat;
  readonly source?: LibraryRef;
}

/** Výšková zóna na stěně: typ úpravy od horní hrany předchozí zóny do `top` nad čistou podlahou. */
export interface CoveringZone {
  /** Typ úpravy; null = bez úpravy (holá konstrukce). */
  readonly typeId: Id | null;
  /** Horní hrana zóny nad čistou podlahou (mm); null = až ke stropu (poslední zóna). */
  readonly top: number | null;
}

/** Strana stěny, na kterou se v místnosti díváme: líc (ref / opp), nebo čelo volného konce. */
export const FACE_SIDES = ['ref', 'opp', 'start', 'end'] as const;
export type FaceSide = (typeof FACE_SIDES)[number];

/** Přiřazení úprav povrchů místnosti (uloženo v místnosti, odkazy jsou logické – základ 14). */
export interface RoomCoverings {
  /** Zóny stěn pro celou místnost (odspodu nahoru). */
  readonly wallZones?: readonly CoveringZone[];
  /** Přepis pro jednu stěnu a stranu; klíč `wallId:strana`. */
  readonly wallOverrides?: Readonly<Record<string, readonly CoveringZone[]>>;
  readonly floor?: Id | null;
  readonly ceiling?: Id | null;
}

export const faceKey = (wallId: Id, side: FaceSide): string => `${wallId}:${side}`;

/** Celá stěna jednou úpravou (bez zón). */
export const NO_ZONES: readonly CoveringZone[] = [{ typeId: null, top: null }];
