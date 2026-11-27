// Hodnota výškové kóty z modelu (asociativita): úroveň podlaží, nebo horní / spodní hrana stěny či desky.
// Zápis podle ČSN 01 3420: metry na 3 desetinná místa s desetinnou čárkou, bez jednotky; ±0,000, nad nulou
// „+“, pod nulou „-“. Absolutní kóta: nadmořská výška Bpv z georeference (základ 17) „250,850 m n. m.“
import type { Model } from '../model/types.ts';
import { slabLevels } from '../slab/geometry.ts';
import { wallHeight } from '../wall-height/resolve.ts';
import type { LevelRef } from './types.ts';

/** Výška kótované úrovně nad ±0,000 (mm); null = odkaz už neplatí (prvek smazán). */
export function levelZ(model: Model, ref: LevelRef): number | null {
  if (ref.kind === 'storey') return model.storeys[ref.storeyId]?.elevation ?? null;
  if (ref.kind === 'terrain') return ref.z;
  const el = model.elements[ref.elementId];
  if (!el) return null;
  if (el.category === 'slab') {
    const lv = slabLevels(model, el);
    return ref.edge === 'top' ? lv.top : lv.bottom;
  }
  const h = wallHeight(model, el);
  return ref.edge === 'top' ? h.top : h.bottom;
}

const metres = (mm: number) => (Math.abs(Math.round(mm)) / 1000).toFixed(3).replace('.', ',');

/** Relativní kóta k ±0,000: ±0,000 / +2,750 / -0,450 (ČSN 01 3420). */
export function elevationText(z: number): string {
  const r = Math.round(z);
  if (r === 0) return `±${metres(0)}`;
  return `${r > 0 ? '+' : '-'}${metres(r)}`;
}

/** Absolutní kóta: nadmořská výška ve výškovém systému Bpv, „250,850 m n. m.“ */
export function absoluteText(model: Model, z: number): string {
  const mm = model.project.georef.elevationBpv * 1000 + z;
  return `${mm < 0 ? '-' : ''}${metres(mm)} m n. m.`;
}

/** Vztah nuly k Bpv pro razítko a poznámku výkresu: „±0,000 = 250,850 m n. m. Bpv“. */
export const zeroToBpv = (model: Model): string => `±0,000 = ${absoluteText(model, 0)} Bpv`;
