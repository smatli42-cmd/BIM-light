// Výška prvku vázaná na podlaží (základ 12): spodek = podlaží + odsazení,
// vršek = pevná výška NEBO jiné podlaží + odsazení. Při změně podlaží se prvek přizpůsobí sám.
import type { Id } from '../ids/index.ts';
import type { Model } from './types.ts';

export type HeightTop =
  | { readonly kind: 'height'; readonly value: number }
  | { readonly kind: 'storey'; readonly storeyId: Id; readonly offset: number };

export interface HeightBinding {
  readonly baseStoreyId: Id;
  readonly baseOffset: number;
  readonly top: HeightTop;
}

export interface ResolvedHeight {
  /** Výška spodku nad ±0,000 (mm). */
  readonly bottom: number;
  /** Výška vršku nad ±0,000 (mm). */
  readonly top: number;
}

/** Spočítá absolutní spodek a vršek. Neznámé podlaží = chyba v datech. */
export function resolveHeight(model: Model, h: HeightBinding): ResolvedHeight {
  const base = model.storeys[h.baseStoreyId];
  if (!base) throw new Error(`Neznámé podlaží ${h.baseStoreyId}`);
  const bottom = base.elevation + h.baseOffset;
  if (h.top.kind === 'height') return { bottom, top: bottom + h.top.value };
  const topStorey = model.storeys[h.top.storeyId];
  if (!topStorey) throw new Error(`Neznámé podlaží ${h.top.storeyId}`);
  return { bottom, top: topStorey.elevation + h.top.offset };
}
