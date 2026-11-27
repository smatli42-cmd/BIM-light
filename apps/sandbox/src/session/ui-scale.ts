// Velikost rozhraní (pokyn uživatele 2026-11-27): jedno číslo pro CSS i pro texty kreslené
// do plátna v px (tracker přichycení, dočasné kóty). Výkres z jádra (mm na papíře) se nemění.

/** Základ „Střední“ je o 20 % větší než původní rozhraní (úroveň Arditu). */
export const UI_BASE = 1.2;

export type UiSize = 'small' | 'medium' | 'large' | 'xlarge';

export const UI_SIZES: readonly { id: UiSize; label: string; factor: number }[] = [
  { id: 'small', label: 'Malé', factor: 0.85 },
  { id: 'medium', label: 'Střední', factor: 1 },
  { id: 'large', label: 'Velké', factor: 1.15 },
  { id: 'xlarge', label: 'Největší', factor: 1.3 },
];

export const isUiSize = (v: unknown): v is UiSize => UI_SIZES.some((s) => s.id === v);

let k = UI_BASE;

/** Násobek px rozhraní vůči původním rozměrům (1 rem = 10 px × násobek). */
export const uiK = () => k;

/** Velikost písma v px pro texty rozhraní kreslené do plátna. */
export const uiPx = (base: number) => Math.round(base * k * 10) / 10;

/** Nastaví velikost: proměnná CSS --ui-scale (bez DOM jen číslo pro plátno). */
export function applyUiSize(size: UiSize) {
  const factor = UI_SIZES.find((s) => s.id === size)?.factor ?? 1;
  k = UI_BASE * factor;
  if (typeof document !== 'undefined')
    document.documentElement.style.setProperty('--ui-scale', String(factor));
}
