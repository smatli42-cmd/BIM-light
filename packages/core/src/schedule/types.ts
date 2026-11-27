// Výkazy a legendy (základ 8, plán stěn Z8): jeden obecný mechanismus „tabulka z modelu“.
// Definice výkazu jsou data v projektu (jako výkaz v Revitu / Archicadu); obsah se vždy počítá z modelu.
import type { Id } from '../ids/index.ts';
import type { Status } from '../model/types.ts';

/** Zdroj řádků: stěny, vrstvy stěn (výkaz materiálů), typy stěn (legenda skladeb), desky (D4). */
export type ScheduleSource = 'walls' | 'wall-layers' | 'wall-types' | 'slabs';
export const SCHEDULE_SOURCES: readonly ScheduleSource[] = ['walls', 'wall-layers', 'wall-types', 'slabs'];

export interface ScheduleFilter {
  /** Jen tato podlaží; prázdné = všechna. */
  readonly storeyIds: readonly Id[];
  /** Jen tyto stavy; prázdné = všechny. */
  readonly statuses: readonly Status[];
  /** Hlavní model, nebo i varianty. */
  readonly variants: 'main' | 'all';
  /** Legenda: jen typy, které nějaká stěna používá. */
  readonly onlyUsed: boolean;
}

export interface ScheduleDef {
  readonly id: Id;
  readonly name: string;
  readonly source: ScheduleSource;
  /** Sloupce = klíče polí zdroje v pořadí zobrazení. */
  readonly fields: readonly string[];
  /** Seskupení (pořadí = priorita řazení). */
  readonly groupBy: readonly string[];
  /** Každý prvek na vlastním řádku (true), nebo jeden řádek za skupinu se součty (false). */
  readonly itemize: boolean;
  /** Řazení uvnitř skupiny; null = podle prvního sloupce. */
  readonly sortBy: string | null;
  readonly filter: ScheduleFilter;
  /**
   * Odečet otvorů z ploch (sekce 9: rozpočtové zvyklosti se liší): otvory s plochou do této meze (m²)
   * se neodečítají. 0 = odečíst všechny. Objem odečítá vždy všechny otvory.
   */
  readonly minOpeningArea: number;
}

/** Hodnota buňky: text, číslo (v jednotce pole), nebo ano / ne. */
export type CellValue = string | number | boolean;
export type ScheduleRow = Readonly<Record<string, CellValue>>;

export const DEFAULT_FILTER: ScheduleFilter = {
  storeyIds: [],
  statuses: [],
  variants: 'main',
  onlyUsed: true,
};
