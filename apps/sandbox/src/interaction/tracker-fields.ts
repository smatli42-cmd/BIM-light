// Společná pole trackeru u kurzoru (koncepce rozhraní, část 2 I): ΔX a ΔY od výchozího bodu.
import type { Vec2 } from '@bim-light/core';
import type { TrackerField } from './types.ts';

/** Číslo v mm pro tracker (celé mm, záporné se znaménkem). */
export const trackerMm = (v: number) => String(Math.round(v) === 0 ? 0 : Math.round(v));

/** ΔX a ΔY z bodu `from` do bodu `to` (osa Y nahoru, jako v modelu). */
export function deltaFields(from: Vec2, to: Vec2): TrackerField[] {
  return [
    { label: 'ΔX', value: trackerMm(to.x - from.x), active: false },
    { label: 'ΔY', value: trackerMm(to.y - from.y), active: false },
  ];
}
