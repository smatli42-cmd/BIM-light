// Prvky za rovinou řezu do hloubky pohledu (pohledové hrany, rozhodnutí 19) a celý pohled (fasáda):
// část prvku v pásmu pohledu (od čáry do hloubky) se promítne na rovinu výkresu jako plocha (u, z).
// Stěna = šířka v pohledu × výška stěny minus otvory (okna a dveře jsou otvor; výplň přijde s etapou 4),
// deska = šířka × tloušťka. Plocha slouží ke kresbě obrysu i k zakrývání prvků dál (occlude.ts).
import { clipRect, difference, planePolygon, rect, type PlanePolygon } from '../covering/polygon.ts';
import type { Vec2 } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import type { Model } from '../model/types.ts';
import { openingFootprint } from '../opening/footprint.ts';
import { openingLevels, openingsOf } from '../opening/geometry.ts';
import { slabLevels } from '../slab/geometry.ts';
import type { Slab } from '../slab/types.ts';
import { wallGeometry } from '../wall/geometry.ts';
import type { Wall } from '../wall/types.ts';
import { wallHeight } from '../wall-height/resolve.ts';
import { cropToRange, slabPlan } from './cut.ts';
import { partZone, toFrame, type SectionFrame } from './frame.ts';
import type { SectionRange } from './types.ts';

export interface Projected {
  readonly elementId: Id;
  /** Nejbližší bod prvku za rovinou (mm). */
  readonly depth: number;
  readonly shapes: readonly PlanePolygon[];
}

interface Extent {
  readonly u0: number;
  readonly u1: number;
  readonly depth: number;
}

/** Rozsah u a nejbližší hloubka části půdorysu v pásmu pohledu; null = mimo pásmo. */
export function extentInZone(f: SectionFrame, plan: readonly PlanePolygon[]): Extent | null {
  // Zalomený řez: každý úsek má své pásmo od své roviny; hloubka se měří od roviny úseku.
  const pts = f.parts.flatMap((part) =>
    clipRect(plan, partZone(f, part))
      .flatMap((p) => p.outer)
      .map((p) => {
        const q = toFrame(f, p);
        return { u: q.u, d: q.d - part.d0 };
      }),
  );
  if (!pts.length) return null;
  const us = pts.map((p) => p.u);
  const u0 = Math.min(...us);
  const u1 = Math.max(...us);
  if (u1 - u0 < 1e-3) return null;
  return { u0, u1, depth: Math.max(0, Math.min(...pts.map((p) => p.d))) };
}

const loops = (outlines: readonly (readonly Vec2[])[]): PlanePolygon[] =>
  outlines.flatMap((o) => (o.length >= 3 ? planePolygon(o) : []));

/** Otvory stěny v pohledu: část půdorysu otvoru v pásmu × výška otvoru. */
function openingRects(model: Model, wall: Wall, f: SectionFrame): Vec2[][] {
  return openingsOf(model, wall.id).flatMap((o) => {
    const e = extentInZone(f, loops([openingFootprint(model, o, wall)]));
    if (!e) return [];
    const { bottom, top } = openingLevels(model, o, wall);
    return [rect(e.u0, bottom, e.u1, top)];
  });
}

export function wallProjection(
  model: Model,
  wall: Wall,
  f: SectionFrame,
  range: SectionRange | null,
): Projected | null {
  const g = wallGeometry(model, wall, Number.NEGATIVE_INFINITY);
  const e = extentInZone(f, loops(g.outlines));
  if (!e) return null;
  const h = wallHeight(model, wall);
  const body = planePolygon(rect(e.u0, h.bottom, e.u1, h.top));
  const shapes = cropToRange(difference(body, openingRects(model, wall, f)), range);
  return shapes.length ? { elementId: wall.id, depth: e.depth, shapes } : null;
}

export function slabProjection(
  model: Model,
  slab: Slab,
  f: SectionFrame,
  range: SectionRange | null,
): Projected | null {
  const e = extentInZone(f, slabPlan(model, slab));
  if (!e) return null;
  const lv = slabLevels(model, slab);
  const shapes = cropToRange(planePolygon(rect(e.u0, lv.bottom, e.u1, lv.top)), range);
  return shapes.length ? { elementId: slab.id, depth: e.depth, shapes } : null;
}
