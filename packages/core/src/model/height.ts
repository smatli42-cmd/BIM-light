// Výška prvku vázaná na podlaží (základ 12, plán stěn Z3): spodek = podlaží + odsazení,
// vršek = pevná výška („nespojeno“) NEBO podlaží + N + odsazení (jako Archicad „Home + N“).
// Stěna přes více podlaží je jen vršek s N > 1. Vršek může končit i na spodním líci desky (desky D4,
// Revit „Attach Top“, Archicad „spojit s deskou“). Výška se počítá, neukládá (základ 4).
import type { Id } from '../ids/index.ts';
import { slabLevels } from '../slab/geometry.ts';
import { storeyLevel } from './storeys.ts';
import type { Model } from './types.ts';

export type HeightTop =
  | { readonly kind: 'height'; readonly value: number }
  /** `storeys` = N ≥ 0 podlaží nad spodním podlažím; N = 0 jen s kladným odsazením. */
  | { readonly kind: 'storey'; readonly storeys: number; readonly offset: number }
  /** Vršek na spodním líci desky `slabId` + odsazení (záporné = pod deskou); mění se s deskou. */
  | { readonly kind: 'slab'; readonly slabId: Id; readonly offset: number };

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

/** Spočítá absolutní spodek a vršek. Neznámé podlaží, deska nebo N mimo budovu = chyba v datech. */
export function resolveHeight(model: Model, h: HeightBinding): ResolvedHeight {
  const base = model.storeys[h.baseStoreyId];
  if (!base) throw new Error(`Neznámé podlaží ${h.baseStoreyId}`);
  const bottom = base.elevation + h.baseOffset;
  if (h.top.kind === 'height') return { bottom, top: bottom + h.top.value };
  if (h.top.kind === 'slab') {
    const slab = model.elements[h.top.slabId];
    if (slab?.category !== 'slab') throw new Error(`Deska ${h.top.slabId} neexistuje`);
    return { bottom, top: slabLevels(model, slab).bottom + h.top.offset };
  }
  const level = storeyLevel(model, h.baseStoreyId, h.top.storeys);
  if (level === null) throw new Error(`Podlaží + ${h.top.storeys} v budově neexistuje`);
  return { bottom, top: level + h.top.offset };
}

/** Chyba vazby výšky, nebo null (příkazy ji odmítnou). */
export function heightError(model: Model, h: HeightBinding): string | null {
  if (!model.storeys[h.baseStoreyId]) return 'Spodní podlaží neexistuje';
  if (h.top.kind === 'slab' && model.elements[h.top.slabId]?.category !== 'slab')
    return `Deska ${h.top.slabId} neexistuje`;
  if (h.top.kind === 'storey') {
    if (!Number.isInteger(h.top.storeys) || h.top.storeys < 0) return 'Počet podlaží nad musí být 0 nebo víc';
    if (storeyLevel(model, h.baseStoreyId, h.top.storeys) === null) {
      return `Budova nemá podlaží + ${h.top.storeys}`;
    }
  }
  const r = resolveHeight(model, h);
  if (!(r.top - r.bottom > 0))
    return h.top.kind === 'slab'
      ? 'Spodní líc desky musí být nad spodkem stěny'
      : 'Vršek musí být nad spodkem (výška > 0)';
  return null;
}
