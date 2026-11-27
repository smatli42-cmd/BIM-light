// 3D tělesa stěn spočítaná z modelu (základ 4, nic se neukládá): každá vrstva skladby je samostatné těleso
// s barvou svého materiálu, vytažené od spodku do vršku stěny (výška vázaná na podlaží, odsazení, přesahy
// vrstev) a s vyříznutými otvory a nikami. Půdorys vrstvy po napojení dává jádro (wallGeometry), tady se jen
// přidá výška. Jádro se jen čte (pravidla 3D proudu).
import {
  openingAcross,
  openingLevels,
  openingsOf,
  openingSpan,
  pointAtStation,
  wallGeometry,
  wallHeight,
  type Id,
  type Model,
  type Opening,
  type Vec2,
  type Wall,
} from '@bim-light/core';
import { sliceLayer, type Cutter, type Slab } from './slice.ts';

/** Přesah půdorysu otvoru přes líc, aby výřez nenechal tenkou blánu (jako v IFC). */
const OVER = 1;
const FALLBACK_COLOR = '#c8c8c8';

export interface Solid {
  /** Prvek, ke kterému těleso patří (výběr ve 3D = výběr prvku). */
  readonly elementId: Id;
  readonly materialId: Id | null;
  readonly color: string;
  readonly transparent: boolean;
  readonly slabs: readonly Slab[];
}

/** Půdorys otvoru: obdélník (u oblouku výseč po 16 dílcích) přes tloušťku, u niky jen do hloubky. */
export function openingFootprint(model: Model, o: Opening, host: Wall): Vec2[] {
  const { s0, s1 } = openingSpan(o);
  const [a, b] = openingAcross(model, o);
  const overA = Math.sign(a - b) * OVER;
  const overB = o.kind === 'niche' ? 0 : Math.sign(b - a) * OVER;
  const lo = Math.min(a + overA, b + overB);
  const hi = Math.max(a + overA, b + overB);
  const n = host.path.kind === 'arc' && Math.abs(host.path.bulge) > 1e-9 ? 16 : 1;
  const st = Array.from({ length: n + 1 }, (_, i) => s0 + ((s1 - s0) * i) / n);
  return [
    ...st.map((s) => pointAtStation(host.path, s, lo)),
    ...[...st].reverse().map((s) => pointAtStation(host.path, s, hi)),
  ];
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
    const slabs = sliceLayer(layer.polygons, bottom, top, cutters);
    if (!slabs.length) return [];
    const materialId = layer.span.layer.materialId ?? null;
    const mat = materialId ? model.materials[materialId] : undefined;
    return [
      {
        elementId: wall.id,
        materialId,
        color: mat?.color ?? FALLBACK_COLOR,
        transparent: mat?.transparent3D ?? false,
        slabs,
      },
    ];
  });
}
