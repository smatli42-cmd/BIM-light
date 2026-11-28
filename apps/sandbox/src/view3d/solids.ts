// 3D tělesa stěn spočítaná z modelu (základ 4, nic se neukládá): každá vrstva skladby je samostatné těleso
// s barvou svého materiálu, vytažené od spodku do vršku stěny (výška vázaná na podlaží, odsazení, přesahy
// vrstev) a s vyříznutými otvory a nikami. Půdorys vrstvy po napojení dává jádro (wallGeometry), tady se jen
// přidá výška. Jádro se jen čte (pravidla 3D proudu).
import {
  openingFootprint,
  openingLevels,
  openingsOf,
  wallGeometry,
  wallHeight,
  wallLayerSlabCuts,
  type Id,
  type Model,
  type Wall,
} from '@bim-light/core';
import { sliceLayer, type Cutter, type Slab } from './slice.ts';

/** Půdorys otvoru je v jádře (společný s řezem). */
export { openingFootprint };

const FALLBACK_COLOR = '#c8c8c8';
/** Krytí průhledného materiálu (sklo) ve 3D. */
export const GLASS_OPACITY = 0.35;
export const materialOpacity = (mat: { transparent3D: boolean } | undefined): number =>
  mat?.transparent3D ? GLASS_OPACITY : 1;

export interface Solid {
  /** Prvek, ke kterému těleso patří (výběr ve 3D = výběr prvku). */
  readonly elementId: Id;
  readonly materialId: Id | null;
  readonly color: string;
  /** Krytí 0–1 (1 = plné); průhledný materiál (sklo) 0,35, pravidlo grafiky může přepsat. */
  readonly opacity: number;
  readonly slabs: readonly Slab[];
  /** Obecné těleso (střecha): trojúhelníky [x, y, z, …] v mm; `slabs` je pak prázdné. */
  readonly mesh?: readonly number[];
  /** Hrany obecného tělesa jako úsečky [x, y, z, x, y, z, …] v mm. */
  readonly edges?: readonly number[];
}

function cuttersOf(model: Model, wall: Wall): Cutter[] {
  return openingsOf(model, wall.id).map((o) => ({
    footprint: openingFootprint(model, o, wall),
    ...openingLevels(model, o, wall),
  }));
}

/**
 * Výška každé vrstvy: u typu s jedním výškovým pásem s přesahy vrstev nahoru a dolů, jinak celá výška
 * stěny (vrstvy podle pásů ve 3D zatím ne – viz docs/STAV-3d.md).
 */
function layerLevels(model: Model, wall: Wall, count: number): { bottom: number; top: number }[] {
  const h = wallHeight(model, wall);
  const band = h.bands.length === 1 ? h.bands[0] : undefined;
  return Array.from({ length: count }, (_, i) => {
    const l = band?.layers[i];
    return l ? { bottom: l.bottom, top: l.top } : { bottom: h.bottom, top: h.top };
  });
}

/** Tělesa jedné stěny (po vrstvách); model má obsahovat jen zobrazené stěny a otvory. */
export function wallSolids(model: Model, wall: Wall): Solid[] {
  // Rovina řezu pod vším: otvory půdorys nepřeruší, vyřízne je až sliceLayer po výšce.
  const g = wallGeometry(model, wall, Number.NEGATIVE_INFINITY);
  const cutters = cuttersOf(model, wall);
  const lv = layerLevels(model, wall, g.layers.length);
  return g.layers.flatMap((layer, i) => {
    const { bottom, top } = lv[i] as { bottom: number; top: number };
    // Uložení stropu (jádro, junction/slab-wall.ts): deska vyřízne jádro a vrstvy na své straně.
    const slabCuts = wallLayerSlabCuts(model, wall.id, i);
    const slabs = sliceLayer(layer.polygons, bottom, top, [...cutters, ...slabCuts]);
    if (!slabs.length) return [];
    const materialId = layer.span.layer.materialId ?? null;
    const mat = materialId ? model.materials[materialId] : undefined;
    return [
      {
        elementId: wall.id,
        materialId,
        color: mat?.color ?? FALLBACK_COLOR,
        opacity: materialOpacity(mat),
        slabs,
      },
    ];
  });
}
