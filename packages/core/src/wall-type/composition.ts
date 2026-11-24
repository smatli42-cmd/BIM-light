// Výpočty nad skladbou (plán stěn Z1, katalog kreslení část 6): jádro, srovnání skladeb,
// změna tloušťky (mění se jádro, povrchové vrstvy zůstanou).
import type { HeightBand, WallLayer, WallType } from './types.ts';

/** Má pás vrstvu s funkcí jádro? (Volba „líc jádra“ je bez jádra zašedlá.) */
export const bandHasCore = (band: HeightBand): boolean => band.layers.some((l) => l.function === 'core');

/** Má typ jádro v každém pásu? */
export const typeHasCore = (type: WallType): boolean =>
  type.bands.length > 0 && type.bands.every(bandHasCore);

/** Počet souvislých skupin vrstev s funkcí jádro (platný typ má nejvýš jednu). */
export function coreGroups(layers: readonly WallLayer[]): number {
  let groups = 0;
  layers.forEach((l, i) => {
    if (l.function === 'core' && layers[i - 1]?.function !== 'core') groups++;
  });
  return groups;
}

/** Index nejtlustší vrstvy z vybraných (při shodě první). */
function thickest(layers: readonly WallLayer[], pick: (l: WallLayer) => boolean): number {
  let best = -1;
  layers.forEach((l, i) => {
    if (pick(l) && (best < 0 || l.thickness > (layers[best]?.thickness ?? 0))) best = i;
  });
  return best;
}

/** Vrstva, která se mění se změnou tloušťky: nejtlustší jádro, bez jádra nejtlustší vrstva. */
export function resizableLayerIndex(band: HeightBand): number {
  const core = thickest(band.layers, (l) => l.function === 'core');
  return core >= 0 ? core : thickest(band.layers, () => true);
}

/** Pás s tloušťkou změněnou o `delta` (jen měněná vrstva). */
export function bandWithDelta(band: HeightBand, delta: number): HeightBand {
  const idx = resizableLayerIndex(band);
  return {
    ...band,
    layers: band.layers.map((l, i) => (i === idx ? { ...l, thickness: l.thickness + delta } : l)),
  };
}

const sameLayer = (a: WallLayer, b: WallLayer) =>
  a.materialId === b.materialId &&
  a.thickness === b.thickness &&
  a.function === b.function &&
  a.extendTop === b.extendTop &&
  a.extendBottom === b.extendBottom;

/** Stejná skladba (pásy i vrstvy), bez ohledu na název a původ. */
export function sameComposition(a: readonly HeightBand[], b: readonly HeightBand[]): boolean {
  return (
    a.length === b.length &&
    a.every((ba, i) => {
      const bb = b[i];
      return (
        !!bb &&
        ba.height === bb.height &&
        ba.layers.length === bb.layers.length &&
        ba.layers.every((l, j) => {
          const other = bb.layers[j];
          return !!other && sameLayer(l, other);
        })
      );
    })
  );
}
