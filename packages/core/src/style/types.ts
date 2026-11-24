// Nastavení zobrazení jako data (základy 26–32). Celé jde exportovat a importovat jako JSON (základ 31).
import type { Id } from '../ids/index.ts';
import type { Category } from '../model/categories.ts';
import type { Hatch } from '../hatch/types.ts';
import type { LibraryRef } from '../model/types.ts';

/** Podrobnost kresby (základ 5): hrubá / střední / jemná. */
export type Detail = 'coarse' | 'medium' | 'fine';
export type LineType = 'solid' | 'dashed' | 'dotted' | 'dash-dot';

/** Šrafa nastavená přímo pravidlem nebo přepisem (ne z materiálu); barvy null = z materiálu. */
export interface HatchEffect {
  /** Id šrafy v projektu (knihovna šraf, základ 34). */
  readonly hatchId: string;
  readonly pen: number;
  readonly lineColor: string | null;
  readonly fillColor?: string | null;
}

/**
 * Efekt grafiky = co se má nastavit; chybějící vlastnost nechá hodnotu z nižšího patra.
 * Tloušťka čáry je vždy jen číslo pera (základ 32).
 */
export interface GraphicEffect {
  readonly visible?: boolean;
  /** Pero obrysu v řezu (řezané konstrukce). */
  readonly cutPen?: number;
  /** Pero čar v pohledu a anotací (kóty). */
  readonly projectionPen?: number;
  /** Pero hranic mezi vrstvami. */
  readonly layerPen?: number;
  readonly lineColor?: string;
  readonly lineType?: LineType;
  /** Plná výplň řezu; null = bez výplně. */
  readonly fillColor?: string | null;
  /** Šrafa: z materiálu, žádná, nebo pevně daná. */
  readonly hatch?: 'material' | 'none' | HatchEffect;
  /** Průhlednost 0–100 %. */
  readonly transparency?: number;
}

/** Úplná grafika (patro 1 musí určit vše). */
export type ResolvedEffect = Required<GraphicEffect>;

/** Vrstva: modelová (prvky podle kategorie) nebo anotační = skupina anotací (základ 28). */
export interface Layer {
  readonly id: Id;
  readonly name: string;
  readonly kind: 'category' | 'annotation';
  /** Kategorie prvků, které do vrstvy spadají (jen modelové vrstvy). */
  readonly categories: readonly Category[];
}

export interface LayerState {
  readonly visible: boolean;
  readonly locked: boolean;
}

/** Kombinace vrstev = uložený stav všech vrstev. */
export interface LayerCombination {
  readonly id: Id;
  readonly name: string;
  readonly states: Readonly<Record<Id, LayerState>>;
}

export type PredicateOp = 'eq' | 'neq' | 'in';
export type PredicateValue = string | number | boolean | readonly (string | number)[];

/** Podmínka na vlastnost prvku (kategorie, profese, stav, varianta, typ, materiál…). */
export interface Predicate {
  readonly property: string;
  readonly op: PredicateOp;
  readonly value: PredicateValue;
}

/** Pravidlo grafiky (základ 30): všechny podmínky platí → použij efekt. */
export interface Rule {
  readonly id: Id;
  readonly name: string;
  readonly conditions: readonly Predicate[];
  readonly effect: GraphicEffect;
  /** Vypnuté pravidlo (např. po importu s neznámou vlastností). */
  readonly disabled?: boolean;
}

/** Kombinace přepisů = seřazená pravidla; první v seznamu má přednost. */
export interface OverrideCombination {
  readonly id: Id;
  readonly name: string;
  readonly ruleIds: readonly Id[];
}

/** Velikosti textů a značek na papíře v mm (základ 29), stejné ve všech měřítcích. */
export interface PaperSizes {
  readonly dimensionText: number;
  readonly labelText: number;
  /** Délka šikmé čárky na konci kóty. */
  readonly dimensionTick: number;
  /** Mezera mezi kótovací čarou a číslem. */
  readonly dimensionTextGap: number;
  /** Mezera mezi prvkem a odkazovou čarou. */
  readonly extensionGap: number;
  /** Přesah odkazové čáry za kótovací čáru. */
  readonly extensionOvershoot: number;
}

export type CategoryGraphics = Partial<Readonly<Record<Category, GraphicEffect>>>;

/** Styl zobrazení (základ 27). */
export interface Style {
  readonly id: Id;
  readonly name: string;
  readonly layerCombinationId: Id;
  readonly detail: Detail;
  readonly overrideCombinationId: Id;
  /** Grafika podle kategorie v tomto stylu (patro 2). */
  readonly categoryGraphics: CategoryGraphics;
  /** Popisky: co se popisuje (čísla místností, plochy…). */
  readonly labels: Readonly<Record<string, boolean>>;
  readonly defaultScale: number;
  /** Měřítko šraf: násobí všechny rozměry šraf (0,5–3, výchozí 1). Mění velikost, ne tvar. */
  readonly hatchScale: number;
  /** Skupina anotací, do které jde nová kóta. */
  readonly defaultAnnotationLayerId: Id;
  readonly source?: LibraryRef;
}

/** Tabulka tlouštěk čar (základ 32): pero × měřítko → mm na papíře. */
export interface PenTable {
  /** Měřítka sloupců (jmenovatel: 50 = 1:50). */
  readonly scales: readonly number[];
  /** Pro každé pero tloušťky v mm, ve stejném pořadí jako `scales`. */
  readonly pens: readonly { readonly pen: number; readonly widths: readonly number[] }[];
}

export interface DisplaySettings {
  readonly schemaVersion: number;
  readonly layers: Readonly<Record<Id, Layer>>;
  readonly layerCombinations: Readonly<Record<Id, LayerCombination>>;
  readonly rules: Readonly<Record<Id, Rule>>;
  readonly overrideCombinations: Readonly<Record<Id, OverrideCombination>>;
  readonly styles: Readonly<Record<Id, Style>>;
  readonly penTable: PenTable;
  /** Patro 1: výchozí grafika (úplná) a grafika podle kategorie. */
  readonly baseGraphics: ResolvedEffect;
  readonly categoryGraphics: CategoryGraphics;
  readonly paperSizes: PaperSizes;
  /** Kopie šraf použitých v projektu s odkazem na původ (základy 21, 34); jsou součástí balíčku. */
  readonly hatches: Readonly<Record<string, Hatch>>;
}
