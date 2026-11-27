// Elektro (koncepce 3, katalog-elektro.md): značka je BIM prvek s typem a instancí (základy 1, 2).
// Typ = symbol, popis, výchozí výška, skupina legendy, třída IFC; instance = poloha (hostitel), výška,
// označení. Místnost se nepamatuje – počítá se z polohy (základ 4). Vše v mm, čistá JSON data.
import type { Vec2 } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import type { LibraryRef, Status, VariantRef } from '../model/types.ts';
import type { GraphicEffect } from '../style/types.ts';

/** Skupina legendy (silnoproud, osvětlení a ovládání, data, AV, zabezpečení, řízení) s výchozí barvou. */
export interface ElectroGroup {
  readonly id: Id;
  readonly name: string;
  /** Výchozí barva značek skupiny (patro 1 funkce grafiky, jako barva kategorie místnosti). */
  readonly color: string;
  /** Pořadí v legendě. */
  readonly order: number;
}

/** Druh v knihovně (Ardit: přístroje, zařízení, svítidla, rozvaděče). */
export type ElectroFamily = 'device' | 'equipment' | 'light' | 'board';
export const ELECTRO_FAMILIES: readonly ElectroFamily[] = ['device', 'equipment', 'light', 'board'];

/** Výchozí osazení: na líc stěny (otočené kolmo), nebo na strop / do místnosti (bod). */
export type ElectroMount = 'wall' | 'ceiling';
export const ELECTRO_MOUNTS: readonly ElectroMount[] = ['wall', 'ceiling'];

/** Druh rozvaděče (ČSN: hlavní, podružný, elektroměrový, datový). */
export type BoardKind = 'main' | 'sub' | 'meter' | 'data';
export const BOARD_KINDS: readonly BoardKind[] = ['main', 'sub', 'meter', 'data'];

/**
 * Tvar vlastní značky v jednotkách velikosti značky (1 = velikost na papíře, výchozí 4 mm). Osa x po líci
 * stěny, osa y od líce do místnosti; u značky na stropě je počátek střed. Úhly ve stupních proti směru hodin.
 */
export type SymbolShape =
  | { readonly kind: 'line'; readonly points: readonly Vec2[]; readonly closed?: boolean }
  | { readonly kind: 'circle'; readonly center: Vec2; readonly r: number }
  | {
      readonly kind: 'arc';
      readonly center: Vec2;
      readonly r: number;
      readonly from: number;
      readonly to: number;
    }
  | { readonly kind: 'fill'; readonly points: readonly Vec2[] }
  | { readonly kind: 'disc'; readonly center: Vec2; readonly r: number }
  | { readonly kind: 'text'; readonly at: Vec2; readonly text: string; readonly size: number };

/**
 * Půdorysná značka typu: sloty ze znaků knihovny vedle sebe (zásuvka, dvojzásuvka, rámeček…), vlastní
 * tvary, liniové svítidlo (délka v mm modelu) nebo rozvaděč (skutečný rozměr skříně).
 */
export type ElectroSymbol =
  | { readonly kind: 'glyphs'; readonly glyphs: readonly string[] }
  | { readonly kind: 'shapes'; readonly shapes: readonly SymbolShape[] }
  | { readonly kind: 'linear'; readonly lines: 1 | 2 }
  | { readonly kind: 'board'; readonly board: BoardKind };

/** Rozměry skříně rozvaděče (mm): šířka po stěně, výška, hloubka, zapuštění do stěny. */
export interface BoardSize {
  readonly width: number;
  readonly height: number;
  readonly depth: number;
  readonly recess: number;
}

/** Rozložení slotů rámečku: vedle sebe / pod sebou (v půdorysu vždy po líci, rozdíl až v pohledu). */
export type SlotLayout = 'row' | 'column';
export const SLOT_LAYOUTS: readonly SlotLayout[] = ['row', 'column'];

export interface ElectroType {
  readonly id: Id;
  readonly name: string;
  /** Popis do legendy (např. „Zásuvka 230 V jednonásobná“). */
  readonly description: string;
  readonly family: ElectroFamily;
  readonly groupId: Id;
  /** Třída IFC (IfcOutlet, IfcSwitchingDevice, IfcLightFixture…) a PredefinedType. */
  readonly ifcClass: string;
  readonly predefinedType: string;
  readonly mount: ElectroMount;
  /** Výchozí výška osy (středu) nad podlahou v mm; null = na stropě. */
  readonly defaultHeight: number | null;
  readonly symbol: ElectroSymbol;
  readonly layout?: SlotLayout;
  /** Rozvaděč: výchozí rozměry skříně. */
  readonly board?: BoardSize;
  /** Liniové svítidlo: výchozí délka (mm). */
  readonly length?: number;
  readonly source?: LibraryRef;
}

/** Hostitel: líc stěny (poloha po referenční čáře + strana) nebo volný bod (strop, místnost). */
export type ElectroHost =
  | { readonly kind: 'wall'; readonly wallId: Id; readonly offset: number; readonly side: 'ref' | 'opp' }
  | { readonly kind: 'free'; readonly point: Vec2; readonly angle: number };

/** Značka v půdorysu (Ardit „Značka v půdorysu“): velikost a odsazení v mm na papíře, natočení ve °. */
export interface SymbolPlacement {
  readonly size?: number;
  readonly along?: number;
  readonly out?: number;
  readonly rotation?: number;
}

export interface ElectroElement {
  readonly id: Id;
  readonly ifcClass: string;
  readonly category: 'electrical';
  readonly discipline: string;
  readonly status: Status;
  readonly variant: VariantRef;
  readonly storeyId: Id;
  readonly typeId: Id;
  readonly host: ElectroHost;
  /** Výška osy nad podlahou (mm); chybí = výchozí výška typu. */
  readonly height?: number;
  /** Označení (S2a, Z1, „Z2, D1, T1“, RH). */
  readonly mark: string;
  /** Rámeček: vlastní sloty místo slotů typu. */
  readonly slots?: readonly string[];
  readonly layout?: SlotLayout;
  readonly symbol?: SymbolPlacement;
  /** Rozvaděč: rozměry odlišné od typu. */
  readonly board?: Partial<BoardSize>;
  /** Liniové svítidlo: délka odlišná od typu. */
  readonly length?: number;
  readonly graphicOverride?: GraphicEffect;
}

/** Výchozí velikost značky na papíře (Ardit 4 mm) a výška popisků (mm). */
export const DEFAULT_SYMBOL_SIZE = 4;
export const DEFAULT_ELECTRO_TEXT = 2;
