// Text kóty podle českých zvyklostí: mm bez jednotky, desetinná čárka (katalog kreslení, část 3).
import type { Dimension } from './types.ts';

export function formatLength(mm: number): string {
  const r = Math.round(mm * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1).replace('.', ',');
}

export function formatAngle(deg: number): string {
  const r = Math.round(deg * 100) / 100;
  return `${String(r).replace('.', ',')}°`;
}

/** Text, který se u kóty zobrazí: přepsaný, nebo skutečná hodnota. */
export function dimensionText(d: Dimension, value: number): string {
  if (d.textOverride !== null) return d.textOverride;
  return d.kind === 'angular' ? formatAngle(value) : formatLength(value);
}
