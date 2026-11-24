// Tabulka tlouštěk čar (základ 32): pero × měřítko → mm na papíře.
// Jádro vrací v kresbě jen číslo pera; tuto funkci volá až vykreslení (sandbox, PDF, DXF).
import type { PenTable } from './types.ts';

/** Výchozí měřítka sloupců (katalog pohledů: Tloušťky čar). */
export const DEFAULT_SCALES = [20, 50, 100, 200, 500] as const;

/** Řada ISO 128, 7 per; stejné hodnoty ve všech měřítcích [R]. */
export const ISO_128_WIDTHS = [0.13, 0.18, 0.25, 0.35, 0.5, 0.7, 1.0] as const;

export function defaultPenTable(): PenTable {
  return {
    scales: [...DEFAULT_SCALES],
    pens: ISO_128_WIDTHS.map((w, i) => ({ pen: i + 1, widths: DEFAULT_SCALES.map(() => w) })),
  };
}

/** Sloupec pro měřítko: přesná shoda, jinak nejbližší (poměrově). */
export function scaleColumn(table: PenTable, scale: number): number {
  let best = 0;
  let bestErr = Infinity;
  table.scales.forEach((s, i) => {
    const err = Math.abs(Math.log(s / scale));
    if (err < bestErr) {
      best = i;
      bestErr = err;
    }
  });
  return best;
}

/** Tloušťka pera v mm na papíře pro dané měřítko. Neznámé pero = nejbližší existující. */
export function penWidthMm(table: PenTable, pen: number, scale: number): number {
  const sorted = [...table.pens].sort((a, b) => Math.abs(a.pen - pen) - Math.abs(b.pen - pen));
  const row = sorted[0];
  if (!row) throw new Error('Tabulka per je prázdná');
  return row.widths[scaleColumn(table, scale)] ?? row.widths[0] ?? 0.25;
}

/** Vrátí tabulku se změněnou hodnotou jednoho pera v jednom měřítku. */
export function withPenWidth(table: PenTable, pen: number, scale: number, mm: number): PenTable {
  const col = table.scales.indexOf(scale);
  if (col < 0) throw new Error(`Měřítko 1:${scale} není ve sloupcích tabulky`);
  const exists = table.pens.some((p) => p.pen === pen);
  const pens = exists ? table.pens : [...table.pens, { pen, widths: table.scales.map(() => mm) }];
  return {
    ...table,
    pens: pens.map((p) =>
      p.pen === pen ? { ...p, widths: p.widths.map((w, i) => (i === col ? mm : w)) } : p,
    ),
  };
}
