// Popis polí výkazu (základ 15b): název, jednotka, počet desetinných míst a zda se sčítá.
// Pole popisuje zdroj; výpočet tabulky je společný pro všechny zdroje.
import type { Model } from '../model/types.ts';
import type { CellValue, ScheduleDef, ScheduleRow } from './types.ts';

export interface ScheduleField {
  readonly key: string;
  readonly label: string;
  /** Jednotka v záhlaví (m, m², m³, mm, ks); prázdná u textu. */
  readonly unit: string;
  /** Desetinná místa u čísla. */
  readonly decimals: number;
  /** Sčítá se ve skupině a v celkovém součtu. */
  readonly sum: boolean;
}

export interface ScheduleSourceDef {
  readonly label: string;
  readonly fields: readonly ScheduleField[];
  /** Řádky zdroje po použití filtru definice (hodnoty v jednotkách polí, nezaokrouhlené). */
  rows(model: Model, def: ScheduleDef): ScheduleRow[];
}

export const text = (key: string, label: string): ScheduleField => ({
  key,
  label,
  unit: '',
  decimals: 0,
  sum: false,
});

export const num = (
  key: string,
  label: string,
  unit: string,
  decimals: number,
  sum = true,
): ScheduleField => ({
  key,
  label,
  unit,
  decimals,
  sum,
});

/** Zaokrouhlení čísla podle pole. */
export const roundDecimals = (v: number, decimals: number) => {
  const k = 10 ** decimals;
  return Math.round(v * k) / k;
};

/** Text buňky pro zobrazení a CSV (čárka jako desetinný oddělovač). */
export function formatCell(f: ScheduleField | undefined, v: CellValue | undefined): string {
  if (v === undefined) return '';
  if (typeof v === 'boolean') return v ? 'ano' : 'ne';
  if (typeof v === 'number')
    return roundDecimals(v, f?.decimals ?? 0)
      .toFixed(f?.decimals ?? 0)
      .replace('.', ',');
  return v;
}
