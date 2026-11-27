// Výška stěny a jejích vrstev (plán stěn Z3): spodek a vršek z vazby na podlaží, výškové pásy typu
// a prodloužení vrstev nahoře a dole (omítka pod strop, sokl pod podlahu). Jen výpočet, nic se neukládá.
import { resolveHeight, type ResolvedHeight } from '../model/height.ts';
import type { Model } from '../model/types.ts';
import type { Wall, WallLayer } from '../wall/types.ts';
import { wallBase } from './base-slab.ts';

export interface LayerHeight {
  readonly layer: WallLayer;
  /** Pořadí vrstvy v pásu (od referenční strany). */
  readonly index: number;
  /** Spodek a vršek vrstvy nad ±0,000 (mm), včetně prodloužení. */
  readonly bottom: number;
  readonly top: number;
}

export interface BandHeight {
  /** Spodek a vršek pásu nad ±0,000 (mm), bez prodloužení. */
  readonly bottom: number;
  readonly top: number;
  readonly layers: readonly LayerHeight[];
}

export interface WallHeight extends ResolvedHeight {
  /** Výška stěny (vršek − spodek, mm). */
  readonly height: number;
  /** Pásy, které do výšky stěny zasahují (pás nad vrškem se vynechá). */
  readonly bands: readonly BandHeight[];
}

/**
 * Spočítá výšku stěny, pásů a vrstev. Prodloužení dole platí pro vrstvy nejspodnějšího pásu,
 * nahoře pro vrstvy pásu, který končí vrškem stěny. Záporné prodloužení vrstvu zkrátí.
 */
export function wallHeight(model: Model, wall: Wall): WallHeight {
  const h = resolveHeight(model, wall.height);
  const type = model.wallTypes[wall.typeId];
  const bands: BandHeight[] = [];
  let from = h.bottom;
  for (const band of type?.bands ?? []) {
    if (from >= h.top) break;
    const to = band.height === null ? h.top : Math.min(h.top, from + band.height);
    const first = bands.length === 0;
    const last = to >= h.top;
    const layers = band.layers.map((layer, index) => ({
      layer,
      index,
      bottom: from - (first ? layer.extendBottom : 0),
      top: to + (last ? layer.extendTop : 0),
    }));
    bands.push({ bottom: from, top: to, layers });
    from = to;
  }
  // Stěna na skladbě podlahy sahá k nosné desce (base-slab.ts): prodlouží se jen spodní pás, hranice pásů
  // zůstanou ve stejné výšce.
  const base = wallBase(model, wall);
  const first = bands[0];
  if (base < h.bottom && first)
    bands[0] = {
      ...first,
      bottom: base,
      layers: first.layers.map((l) => ({ ...l, bottom: l.bottom - (h.bottom - base) })),
    };
  const bottom = bands.length ? Math.min(h.bottom, base) : h.bottom;
  return { ...h, bottom, height: h.top - bottom, bands };
}
