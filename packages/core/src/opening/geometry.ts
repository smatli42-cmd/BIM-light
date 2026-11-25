// Poloha otvoru počítaná z modelu (základ 4): úsek po stěně, výška nad ±0,000 a vztah k rovině řezu.
import { pathLength } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import { resolveHeight } from '../model/height.ts';
import type { Model } from '../model/types.ts';
import type { Wall } from '../wall/types.ts';
import type { Opening } from './types.ts';

/** Otvory hostitelské stěny seřazené po délce stěny. */
export const openingsOf = (model: Model, wallId: Id): Opening[] =>
  Object.values(model.openings)
    .filter((o) => o.hostId === wallId)
    .sort((a, b) => a.offset - b.offset || a.id.localeCompare(b.id));

/** Úsek otvoru po referenční čáře: od `s0` do `s1` (mm od začátku). */
export const openingSpan = (o: Opening): { s0: number; s1: number } => ({
  s0: o.offset,
  s1: o.offset + o.width,
});

/** Spodní a horní hrana otvoru nad ±0,000 (mm). */
export function openingLevels(model: Model, o: Opening, host: Wall): { bottom: number; top: number } {
  const base = resolveHeight(model, host.height).bottom + o.sill;
  return { bottom: base, top: base + o.height };
}

/** Kde otvor leží vůči rovině řezu podlaží: protíná ji, je celý nad, nebo celý pod. */
export type CutRelation = 'cut' | 'above' | 'below';

export function cutRelation(model: Model, o: Opening, host: Wall, cutPlane: number): CutRelation {
  const level = (model.storeys[host.storeyId]?.elevation ?? 0) + cutPlane;
  const { bottom, top } = openingLevels(model, o, host);
  if (level < bottom) return 'above';
  if (level > top) return 'below';
  return 'cut';
}

/** Otvory, které v rovině řezu stěnu přeruší. */
export const cuttingOpenings = (model: Model, wall: Wall, cutPlane: number): Opening[] =>
  openingsOf(model, wall.id).filter((o) => cutRelation(model, o, wall, cutPlane) === 'cut');

/** Délka referenční čáry hostitele. */
export const hostLength = (wall: Wall): number => pathLength(wall.path);
