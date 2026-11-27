// Místnost (prvky stavby 9; Revit Room, Archicad Zone, IFC IfcSpace). Ukládá se jen bod uvnitř, číslo,
// název a výška – obrys, plocha, obvod a objem se vždy počítají z líců stěn (základ 4). Ruční obrys je
// výjimka se zámkem (základ 16): pak se obrys nepřepočítává. Místnost je prostorový prvek IFC, ne
// stavební prvek, proto se ukládá zvlášť (`model.rooms`), bez typu a skladby.
import type { Vec2 } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import type { HeightTop } from '../model/height.ts';
import type { Status, VariantRef } from '../model/types.ts';
import type { GraphicEffect } from '../style/types.ts';
import type { RoomCoverings } from '../covering/types.ts';

/** Zadávané údaje místnosti; text povrchů je ruční přepis (jinak se bere z přiřazených úprav). */
export interface RoomProps {
  readonly floorFinish?: string;
  readonly wallFinish?: string;
  readonly ceilingFinish?: string;
  readonly note?: string;
  /** Počet osob. */
  readonly occupants?: number;
  /** Výpočtová vnitřní teplota (°C). */
  readonly temperature?: number;
}

export const ROOM_TEXT_PROPS = ['floorFinish', 'wallFinish', 'ceilingFinish', 'note'] as const;
export const ROOM_NUMBER_PROPS = ['occupants', 'temperature'] as const;

export interface Room {
  readonly id: Id;
  readonly ifcClass: 'IfcSpace';
  readonly category: 'room';
  readonly discipline: string;
  readonly status: Status;
  readonly variant: VariantRef;
  readonly storeyId: Id;
  /** Číslo místnosti, např. „1.01“ (IFC Name). */
  readonly number: string;
  /** Název, např. „Obývací pokoj“ (IFC LongName). */
  readonly name: string;
  /** Bod uvnitř místnosti (mm); z něj se hledá obrys mezi líci stěn. */
  readonly seed: Vec2;
  /** Vršek místnosti (spodek = úroveň podlaží, čistá podlaha); výchozí = podlaží nad. */
  readonly top: HeightTop;
  /** Poloha razítka (mm); bez ní razítko leží v bodě uvnitř. */
  readonly stampAt?: Vec2;
  /** Ruční obrys (zamčený, základ 16): nepočítá se ze stěn. */
  readonly manualOutline?: readonly Vec2[];
  /** Kategorie (funkce) místnosti – barva a druh plochy (obytná / užitková). */
  readonly categoryId?: Id;
  /** Výška podlahy (čisté podlahy) nad úrovní podlaží (mm); spodek místnosti. */
  readonly floorOffset?: number;
  /** Údaje, které program nespočítá (zadává uživatel nebo AI). */
  readonly props?: RoomProps;
  /** Úpravy povrchů: zóny stěn, přepisy jednotlivých stěn, podlaha, strop (základ 14). */
  readonly coverings?: RoomCoverings;
  /** Přepis grafiky „ve všech pohledech“ (patro 5). */
  readonly graphicOverride?: GraphicEffect;
}

/** Výchozí vršek: úroveň podlaží nad (výška místnosti = konstrukční výška podlaží). */
export const DEFAULT_ROOM_TOP: HeightTop = { kind: 'storey', storeys: 1, offset: 0 };

/**
 * Výška nad podlahou, ve které se hledají hranice (mm): stěny, které tuto výšku protnou, místnost
 * ohraničí (i stěna z podlaží pod, která jde přes dvě podlaží). Revit „Computation Height“.
 */
export const ROOM_BOUNDARY_HEIGHT = 1200;

/** Výklenek se započítá jen od této hloubky a světlé výšky, a jen když jde k podlaze (ČSN 73 4301). */
export const NICHE_MIN_DEPTH = 300;
export const NICHE_MIN_HEIGHT = 2000;

/** Stav výpočtu: v pořádku, neuzavřená (nemá obrys), bod uvnitř stěny, nadbytečná (sdílí obrys). */
export type RoomState = 'ok' | 'not-enclosed' | 'in-wall' | 'redundant';
