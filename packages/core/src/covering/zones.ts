// Výškové zóny stěn (prvky stavby 9): seznam odspodu nahoru, každá zóna má typ úpravy a horní hranu nad
// čistou podlahou; poslední jde až ke stropu. Zóny platí pro celou místnost, jednotlivá stěna (a strana)
// je může přepsat. Např. sokl do 100, obklad do 1500, nad tím malba.
import type { Id } from '../ids/index.ts';
import type { Room } from '../room/types.ts';
import { faceKey, NO_ZONES, type CoveringZone, type FaceSide } from './types.ts';

export interface ZoneBand {
  readonly index: number;
  readonly typeId: Id | null;
  /** Spodní a horní hrana nad čistou podlahou (mm). */
  readonly v0: number;
  readonly v1: number;
}

/** Zóny pro stěnu a stranu: přepis stěny, jinak zóny místnosti, jinak jedna prázdná zóna. */
export function zonesFor(room: Room, wallId: Id, side: FaceSide): readonly CoveringZone[] {
  const c = room.coverings;
  return c?.wallOverrides?.[faceKey(wallId, side)] ?? c?.wallZones ?? NO_ZONES;
}

/** Má stěna vlastní zóny (přepis)? */
export const hasOverride = (room: Room, wallId: Id, side: FaceSide): boolean =>
  !!room.coverings?.wallOverrides?.[faceKey(wallId, side)];

/** Zóny jako pásy výšek do `height`; nad poslední zónou s horní hranou zbude pás bez úpravy. */
export function zoneBands(zones: readonly CoveringZone[], height: number): ZoneBand[] {
  const out: ZoneBand[] = [];
  let v0 = 0;
  zones.forEach((z, index) => {
    const v1 = z.top === null ? height : Math.min(z.top, height);
    if (v1 > v0) out.push({ index, typeId: z.typeId, v0, v1 });
    v0 = Math.max(v0, v1);
  });
  if (v0 < height) out.push({ index: zones.length, typeId: null, v0, v1: height });
  return out;
}

/** Pás, do kterého spadá výška v (nad podlahou). */
export const zoneBandAt = (bands: readonly ZoneBand[], v: number): ZoneBand | undefined =>
  bands.find((b) => v >= b.v0 - 1e-6 && v < b.v1) ?? bands[bands.length - 1];

/** Kontrola zón: aspoň jedna, horní hrany rostou, jen poslední může být „ke stropu“ (null). */
export function zonesError(zones: readonly CoveringZone[]): string | null {
  if (!zones.length) return 'Zadejte aspoň jednu zónu';
  let prev = 0;
  for (const [i, z] of zones.entries()) {
    const last = i === zones.length - 1;
    if (z.top === null) {
      if (!last) return 'Zóna „ke stropu“ musí být poslední';
      continue;
    }
    if (!(z.top > prev)) return 'Horní hrany zón musí od podlahy růst';
    prev = z.top;
  }
  return null;
}
