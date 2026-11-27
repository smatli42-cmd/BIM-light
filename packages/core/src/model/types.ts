// Model ve tvaru IFC (základy 1–3, 9, 17): Projekt → Budova → Podlaží → prvek.
// Vše jsou čistá JSON data v mm; mění se jen příkazy (základ 6).
import type { Composition } from '../composition/types.ts';
import type { Id } from '../ids/index.ts';
import type { Material } from '../material/types.ts';
import type { Wall, WallType } from '../wall/types.ts';
import type { Relation } from '../relation/types.ts';
import type { Dimension } from '../dimension/types.ts';
import type { DisplaySettings, GraphicEffect } from '../style/types.ts';
import type { View } from '../view/types.ts';
import type { Opening } from '../opening/types.ts';
import type { SlabOpening } from '../slab-opening/types.ts';
import type { View3d } from '../view-3d/types.ts';
import type { Category } from './categories.ts';
import type { ScheduleDef } from '../schedule/types.ts';
import type { WallTag } from '../tag/types.ts';
import type { Slab, SlabType } from '../slab/types.ts';
import type { Room } from '../room/types.ts';
import type { RoomCategory } from '../room/category.ts';
import type { CoveringType } from '../covering/types.ts';

/** Verze tvaru dat; při změně tvaru přibude migrace (persistence/migrations.ts). */
export const SCHEMA_VERSION = 27;

/** Stav prvku (fáze): stávající / bourání / nový. IFC: Pset Status. */
export type Status = 'existing' | 'demolished' | 'new';
export const STATUSES: readonly Status[] = ['existing', 'demolished', 'new'];

/** Příslušnost k variantě: hlavní model, nebo jedna varianta z jedné sady. */
export type VariantRef =
  { readonly kind: 'main' } | { readonly kind: 'variant'; readonly setId: Id; readonly variantId: Id };

export const MAIN_MODEL: VariantRef = { kind: 'main' };

export interface VariantSet {
  readonly id: Id;
  readonly name: string;
  readonly variants: readonly { readonly id: Id; readonly name: string }[];
}

/** Poloha ve světě (základ 17): počátek v S-JTSK, natočení k severu, ±0,000 v Bpv. */
export interface Georeference {
  /** S-JTSK souřadnice Y počátku projektu (m). */
  readonly sjtskY: number;
  /** S-JTSK souřadnice X počátku projektu (m). */
  readonly sjtskX: number;
  /** Natočení osy Y projektu od severu ve stupních. */
  readonly rotationDeg: number;
  /** Absolutní výška ±0,000 v Bpv (m). */
  readonly elevationBpv: number;
}

export interface Project {
  readonly id: Id;
  readonly name: string;
  readonly georef: Georeference;
}

export interface Building {
  readonly id: Id;
  readonly name: string;
}

/** Podlaží: výška úrovně nad ±0,000 a konstrukční výška (mm). IFC: IfcBuildingStorey. */
export interface Storey {
  readonly id: Id;
  readonly name: string;
  readonly buildingId: Id;
  readonly elevation: number;
  readonly height: number;
}

/** Odkaz na původ v knihovně (základ 21): typ i styl v projektu je kopie s odkazem. */
export interface LibraryRef {
  readonly libraryId: string;
  readonly itemId: string;
  readonly version: number;
}

/** Prvek vytvořený generátorem (základ 16); `locked` = ručně upraven, generátor ho nepřepíše. */
export interface GeneratorLink {
  readonly generatorId: Id;
  readonly locked: boolean;
}

/** Povinné vlastnosti každého prvku (základy 1, 2). */
export interface ElementBase {
  readonly id: Id;
  readonly ifcClass: string;
  readonly category: Category;
  readonly discipline: string;
  readonly status: Status;
  readonly variant: VariantRef;
  readonly storeyId: Id;
  readonly typeId: Id;
  /** Přepis grafiky „ve všech pohledech“ (patro 5). */
  readonly graphicOverride?: GraphicEffect;
  readonly generator?: GeneratorLink;
}

/** Všechny BIM prvky (stěny, desky); přibudou okna, střechy… */
export type Element = Wall | Slab;

export interface Model {
  readonly schemaVersion: number;
  readonly project: Project;
  readonly buildings: Readonly<Record<Id, Building>>;
  readonly storeys: Readonly<Record<Id, Storey>>;
  readonly materials: Readonly<Record<Id, Material>>;
  readonly wallTypes: Readonly<Record<Id, WallType>>;
  /** Typy desek (strop, podlaha); skladbu berou z `compositions`. */
  readonly slabTypes: Readonly<Record<Id, SlabType>>;
  /** Skladby společné pro stěny, desky a střechy (koncepce rozhraní 11a); pásy typů na ně odkazují. */
  readonly compositions: Readonly<Record<Id, Composition>>;
  readonly elements: Readonly<Record<Id, Element>>;
  /** Otvory v hostitelích (základ 19, plán stěn Z4); hostitel je uložený odkaz `hostId`. */
  readonly openings: Readonly<Record<Id, Opening>>;
  /** Otvory v deskách (D3, základ 19): svislý řez, obrys v půdorysu, hostitelé = desky. */
  readonly slabOpenings: Readonly<Record<Id, SlabOpening>>;
  /** Místnosti (IfcSpace, prvky stavby 9): bod uvnitř, číslo, název; obrys se počítá ze stěn. */
  readonly rooms: Readonly<Record<Id, Room>>;
  /** Kategorie (funkce) místností: barva a druh plochy (Archicad Zone Category). */
  readonly roomCategories: Readonly<Record<Id, RoomCategory>>;
  /** Typy úprav povrchů (IfcCovering: malba, obklad, dlažba…); přiřazení je v místnostech. */
  readonly coveringTypes: Readonly<Record<Id, CoveringType>>;
  /** Vztahy jako samostatné objekty (základ 1, 24). */
  readonly relations: Readonly<Record<Id, Relation>>;
  /** Kóty patří podlaží a mají skupinu anotací (základ 28). */
  readonly dimensions: Readonly<Record<Id, Dimension>>;
  readonly variantSets: Readonly<Record<Id, VariantSet>>;
  /** Nastavení zobrazení (základ 31): vrstvy, styly, pravidla, pera. */
  readonly display: DisplaySettings;
  readonly views: Readonly<Record<Id, View>>;
  /** 3D pohledy (Revit 3D pohled se Section Boxem): grafika jako u půdorysu + podlaží a ořezový kvádr. */
  readonly views3d: Readonly<Record<Id, View3d>>;
  /** Výkazy a legendy (základ 8, plán stěn Z8): definice tabulek z modelu. */
  readonly schedules: Readonly<Record<Id, ScheduleDef>>;
  /** Značky typu stěn v půdorysu (plán stěn Z8): popisky podlaží se skupinou anotací (základ 28). */
  readonly wallTags: Readonly<Record<Id, WallTag>>;
}
