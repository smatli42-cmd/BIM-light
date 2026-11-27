// Text povrchů místnosti pro razítko a výpis místností (prvky stavby 9): z přiřazených úprav (podlaha,
// zóny stěn místnosti, strop). Ruční text v údajích místnosti má přednost (přepis, základ 16).
import type { Model } from '../model/types.ts';
import type { Room } from '../room/types.ts';

export type FinishPlace = 'floorFinish' | 'wallFinish' | 'ceilingFinish';

const dec = (mm: number) => (mm / 1000).toFixed(2).replace('.', ',');
const name = (m: Model, id: string | null | undefined) => (id ? (m.coveringTypes[id]?.name ?? null) : null);

/** Text úprav stěn: „Obklad do 1,50 m, Malba bílá“ (zóny místnosti odspodu). */
function wallText(m: Model, r: Room): string | null {
  const zones = r.coverings?.wallZones ?? [];
  const parts = zones.flatMap((z) => {
    const n = name(m, z.typeId);
    if (!n) return [];
    return [z.top === null ? n : `${n} do ${dec(z.top)} m`];
  });
  return parts.length ? parts.join(', ') : null;
}

/** Povrch místnosti: ruční text, jinak z přiřazených úprav; null = nic. */
export function finishText(m: Model, r: Room, place: FinishPlace): string | null {
  const manual = r.props?.[place];
  if (manual) return manual;
  if (place === 'floorFinish') return name(m, r.coverings?.floor);
  if (place === 'ceilingFinish') return name(m, r.coverings?.ceiling);
  return wallText(m, r);
}
