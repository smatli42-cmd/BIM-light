// Konstrukce proříznuté rovinou řezu (rozhodnutí 19): stěny (přímé i oblouk) a desky po vrstvách skladby
// v souřadnicích výkresu (u, z). Stěna: úseky přímky řezu v obrysu vrstvy po napojení × výška vrstvy, minus
// otvory (parapet, nadpraží; nika jen do své hloubky). Deska: obrys minus ostrovy a otvory v desce × vrstvy
// od spodního líce. Jen výpočet, nic se neukládá.
import { rect, difference, planePolygon, clipRect, type PlanePolygon } from '../covering/polygon.ts';
import type { BandFrame } from '../hatch/band.ts';
import type { Id } from '../ids/index.ts';
import type { Model } from '../model/types.ts';
import { openingFootprint } from '../opening/footprint.ts';
import { openingLevels, openingsOf } from '../opening/geometry.ts';
import { slabLevels } from '../slab/geometry.ts';
import type { Slab } from '../slab/types.ts';
import { wallGeometry } from '../wall/geometry.ts';
import type { Wall } from '../wall/types.ts';
import { wallHeight } from '../wall-height/resolve.ts';
import type { Vec2 } from '../geometry/index.ts';
import { lineIntervals, type SectionFrame } from './frame.ts';
import type { SectionRange } from './types.ts';

/** Jedna řezaná vrstva prvku v jednom úseku čáry řezu. */
export interface CutPiece {
  readonly elementId: Id;
  readonly materialId: Id;
  /** Nosné jádro skladby (jemná podrobnost: hranice jádra perem řezu). */
  readonly core: boolean;
  /** Plochy (u, z), mohou mít díry (otvor uvnitř stěny řezané podélně). */
  readonly shapes: readonly PlanePolygon[];
  /** Kde leží pás vrstvy pro šrafu přes šířku (izolace). */
  readonly band: BandFrame;
}

const BIG = 1e7;

/** Ořízne plochy na rozsah výšky řezu. */
export function cropToRange(shapes: PlanePolygon[], range: SectionRange | null): PlanePolygon[] {
  return range ? clipRect(shapes, rect(-BIG, range.bottom, BIG, range.top)) : shapes;
}

/** Výška vrstev stěny jako ve 3D: jeden pás s prodloužením vrstev, jinak celá výška stěny. */
function layerLevels(model: Model, wall: Wall, count: number): { bottom: number; top: number }[] {
  const h = wallHeight(model, wall);
  const band = h.bands.length === 1 ? h.bands[0] : undefined;
  return Array.from({ length: count }, (_, i) => {
    const l = band?.layers[i];
    return l ? { bottom: l.bottom, top: l.top } : { bottom: h.bottom, top: h.top };
  });
}

/** Otvory stěny v řezu: úseky půdorysu otvoru na přímce řezu × výška otvoru. */
function openingRects(model: Model, wall: Wall, f: SectionFrame): Vec2[][] {
  return openingsOf(model, wall.id).flatMap((o) => {
    const { bottom, top } = openingLevels(model, o, wall);
    return lineIntervals(f, [openingFootprint(model, o, wall)]).map(([u0, u1]) => rect(u0, bottom, u1, top));
  });
}

const vertical = (u: number, z0: number, z1: number, width: number): BandFrame => ({
  path: { kind: 'line', start: { x: u, y: z0 }, end: { x: u, y: z1 } },
  sideA: 0,
  sideB: -width,
  extend: 0,
});

const horizontal = (u0: number, u1: number, z: number, thickness: number): BandFrame => ({
  path: { kind: 'line', start: { x: u0, y: z }, end: { x: u1, y: z } },
  sideA: 0,
  sideB: thickness,
  extend: 0,
});

/** Řezané vrstvy stěny (model = jen viditelné stěny a otvory). */
export function wallCut(model: Model, wall: Wall, f: SectionFrame, range: SectionRange | null): CutPiece[] {
  const g = wallGeometry(model, wall, Number.NEGATIVE_INFINITY);
  const levels = layerLevels(model, wall, g.layers.length);
  const holes = openingRects(model, wall, f);
  return g.layers.flatMap((layer, i) => {
    const { bottom, top } = levels[i] as { bottom: number; top: number };
    return lineIntervals(f, layer.polygons).flatMap(([u0, u1]) => {
      // Uložení stropu (junction/slab-wall.ts): deska vyřízne jádro a vrstvy na své straně ve své výšce.
      const slabs = wallLayerSlabCuts(model, wall.id, i).flatMap((c) =>
        lineIntervals(f, [c.footprint]).map(([a, b]) => rect(a, c.bottom, b, c.top)),
      );
      const shapes = cropToRange(
        difference(planePolygon(rect(u0, bottom, u1, top)), [...holes, ...slabs]),
        range,
      );
      if (!shapes.length) return [];
      return [
        {
          elementId: wall.id,
          materialId: layer.span.layer.materialId,
          core: layer.span.layer.function === 'core',
          shapes,
          band: vertical(u0, bottom, top, u1 - u0),
        },
      ];
    });
  });
}

import { slabPlan } from '../slab/plan.ts';
import { slabCutsByWalls, wallLayerSlabCuts } from '../junction/slab-wall.ts';

export { slabPlan };

/** Řezané vrstvy desky (skladba odspodu, horní líc = úroveň podlaží + odsazení). */
export function slabCut(model: Model, slab: Slab, f: SectionFrame, range: SectionRange | null): CutPiece[] {
  const type = model.slabTypes[slab.typeId];
  const comp = type ? model.compositions[type.compositionId] : undefined;
  if (!comp) return [];
  // Stěny, které mají přednost (zateplení přes čelo desky, nosná ŽB stěna u dřevěné desky), desku ořízly.
  const plan = difference(
    slabPlan(model, slab),
    slabCutsByWalls(model, slab.id).map((c) => c.footprint),
  );
  const intervals = lineIntervals(
    f,
    plan.flatMap((p) => [p.outer, ...p.holes]),
  );
  let z = slabLevels(model, slab).bottom;
  return comp.layers.flatMap((layer) => {
    const z0 = z;
    z += layer.thickness;
    return intervals.flatMap(([u0, u1]) => {
      const shapes = cropToRange(planePolygon(rect(u0, z0, u1, z)), range);
      if (!shapes.length) return [];
      return [
        {
          elementId: slab.id,
          materialId: layer.materialId,
          core: layer.function === 'core',
          shapes,
          band: horizontal(u0, u1, z0, layer.thickness),
        },
      ];
    });
  });
}
