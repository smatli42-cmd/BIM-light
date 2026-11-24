// Pořadí podlaží v budově a úrovně „podlaží + N“ (základ 12, plán stěn Z3).
// Podlaží jsou seřazená podle výšky úrovně; při shodě podle id (stabilní pořadí).
import type { Id } from '../ids/index.ts';
import type { Model, Storey } from './types.ts';

/** Podlaží jedné budovy odspodu nahoru. */
export function storeysOf(model: Model, buildingId: Id): Storey[] {
  return Object.values(model.storeys)
    .filter((s) => s.buildingId === buildingId)
    .sort((a, b) => a.elevation - b.elevation || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** Podlaží budovy seřazená a pořadí zadaného podlaží v nich. */
export function storeyStack(model: Model, storeyId: Id): { stack: Storey[]; index: number } {
  const s = model.storeys[storeyId];
  if (!s) throw new Error(`Neznámé podlaží ${storeyId}`);
  const stack = storeysOf(model, s.buildingId);
  return { stack, index: stack.findIndex((x) => x.id === storeyId) };
}

/**
 * Úroveň „podlaží + N“ nad ±0,000 (mm). N = 0 je úroveň podlaží samotného, N = 1 úroveň podlaží
 * nad ním… Nad nejvyšším podlažím je ještě jedna úroveň: jeho vršek (úroveň + konstrukční výška).
 * Vyšší N, než budova má, vrátí null.
 */
export function storeyLevel(model: Model, storeyId: Id, n: number): number | null {
  const { stack, index } = storeyStack(model, storeyId);
  const target = stack[index + n];
  if (target) return target.elevation;
  const last = stack[stack.length - 1];
  if (last && index + n === stack.length) return last.elevation + last.height;
  return null;
}

/** Nejvyšší N, které ještě má úroveň (počet podlaží nad + vršek budovy). */
export function maxStoreysAbove(model: Model, storeyId: Id): number {
  const { stack, index } = storeyStack(model, storeyId);
  return stack.length - index;
}
