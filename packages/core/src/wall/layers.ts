// Vrstvy stěny v příčném řezu: kde leží líce a hranice vrstev vůči referenční čáře.
// Offset = vzdálenost v mm doleva od směru kreslení (záporná = doprava).
import type { HeightBand, ReferenceLine, Wall, WallFace, WallLayer, WallType } from './types.ts';

/** Výchozí výška roviny řezu půdorysu nad podlažím (rozhodnutí 2). */
export const DEFAULT_CUT_HEIGHT = 1000;

/** Pás, který protíná rovina řezu (výška nad spodkem stěny). */
export function bandAt(type: WallType, heightAboveBase: number): HeightBand {
  let top = 0;
  for (const band of type.bands) {
    if (band.height === null) return band;
    top += band.height;
    if (heightAboveBase < top) return band;
  }
  const last = type.bands[type.bands.length - 1];
  if (!last) throw new Error(`Typ stěny ${type.name} nemá žádný pás`);
  return last;
}

export const bandThickness = (band: HeightBand): number => band.layers.reduce((s, l) => s + l.thickness, 0);

/** Vzdálenost referenční čáry od referenční strany svazku vrstev. */
export function referenceDepth(band: HeightBand, ref: ReferenceLine): number {
  if (ref === 'face') return 0;
  if (ref === 'axis') return bandThickness(band) / 2;
  if (ref === 'opp-face') return bandThickness(band);
  let depth = 0;
  for (const layer of band.layers) {
    if (layer.function === 'core') return depth;
    depth += layer.thickness;
  }
  return 0;
}

export interface LayerSpan {
  readonly layer: WallLayer;
  /** Offset hranice na referenční straně. */
  readonly from: number;
  /** Offset hranice na straně tloušťky. */
  readonly to: number;
}

export interface CrossSection {
  readonly thickness: number;
  readonly faces: Readonly<Record<WallFace, number>>;
  readonly layers: readonly LayerSpan[];
}

/** Příčný řez stěny pro daný pás: offsety líců, osy a hranic vrstev. */
export function crossSection(wall: Pick<Wall, 'side' | 'referenceLine'>, band: HeightBand): CrossSection {
  const s = wall.side === 'left' ? 1 : -1;
  const t = bandThickness(band);
  const d = referenceDepth(band, wall.referenceLine);
  const at = (depth: number) => s * (depth - d);
  const layers: LayerSpan[] = [];
  let depth = 0;
  for (const layer of band.layers) {
    layers.push({ layer, from: at(depth), to: at(depth + layer.thickness) });
    depth += layer.thickness;
  }
  return { thickness: t, faces: { ref: at(0), opp: at(t), axis: at(t / 2) }, layers };
}
