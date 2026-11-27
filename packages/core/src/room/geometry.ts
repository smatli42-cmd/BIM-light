// Spočítaná místnost (prvky stavby 9, ČSN 73 4301): obrys mezi vnitřními líci stěn včetně omítek,
// ostrovy (sloup, komín, šachta – odečtou se), započítané výklenky, plocha, obvod, výška a objem.
// Dveřní otvor se nepočítá (hranice vede v líci stěny), zařizovací předměty se neodečítají.
// Výsledek se pamatuje pro daný model (data se nemění, každá změna je nový model).
import type { Vec2 } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import { resolveHeight } from '../model/height.ts';
import type { Model } from '../model/types.ts';
import { pointInPolygon } from '../selection/pick.ts';
import { polygonPerimeter, signedArea } from '../slab/geometry.ts';
import { freeSpaceLoops } from './arrangement.ts';
import { boundingShapes, boundingWalls } from './bounding.ts';
import type { Room, RoomState } from './types.ts';

export interface RoomGeometry {
  readonly state: RoomState;
  /** Obrys proti směru hodin (prázdný u neuzavřené místnosti). */
  readonly outline: readonly Vec2[];
  /** Ostrovy uvnitř (svislé konstrukce, které se odečtou). */
  readonly holes: readonly (readonly Vec2[])[];
  /** Plocha v mm² (obrys minus ostrovy). */
  readonly area: number;
  /** Obvod v mm (obrys i ostrovy). */
  readonly perimeter: number;
  /** Výška místnosti (mm) a objem (mm³). */
  readonly height: number;
  readonly volume: number;
  /** Výklenky (otvory typu nika), které se započítaly do plochy. */
  readonly niches: readonly Id[];
}

interface Spaces {
  readonly loops: readonly Vec2[][];
  readonly solids: readonly (readonly Vec2[])[];
  readonly voids: readonly (readonly Vec2[])[];
  readonly niches: readonly Id[];
}

const cache = new WeakMap<Model, Map<string, Spaces>>();

function spaces(model: Model, r: Room): Spaces {
  const key = `${r.storeyId}|${r.status}|${JSON.stringify(r.variant)}`;
  const m = cache.get(model) ?? new Map<string, Spaces>();
  cache.set(model, m);
  const hit = m.get(key);
  if (hit) return hit;
  const shapes = boundingShapes(model, boundingWalls(model, r.storeyId, r.status, r.variant));
  const s = { ...shapes, loops: freeSpaceLoops(shapes.solids, shapes.voids) };
  m.set(key, s);
  return s;
}

/** Nejmenší obrys místnosti (smyčka proti směru hodin), který obsahuje bod. */
function enclosing(loops: readonly Vec2[][], p: Vec2): Vec2[] | undefined {
  return loops
    .filter((l) => signedArea(l) > 0 && pointInPolygon(p, l))
    .sort((a, b) => signedArea(a) - signedArea(b))[0];
}

/** Bod těsně vedle první hrany ostrova (uvnitř ostrova by ležel v konstrukci). */
function probe(hole: readonly Vec2[]): Vec2 {
  const a = hole[0] as Vec2;
  const b = hole[1] as Vec2;
  return { x: (a.x + b.x) / 2 - (b.y - a.y) * 1e-4, y: (a.y + b.y) / 2 + (b.x - a.x) * 1e-4 };
}

/** Obrys a ostrovy místnosti ze stěn (nebo ruční obrys). */
function shape(model: Model, r: Room): Pick<RoomGeometry, 'state' | 'outline' | 'holes' | 'niches'> {
  if (r.manualOutline) return { state: 'ok', outline: r.manualOutline, holes: [], niches: [] };
  const s = spaces(model, r);
  const inSolid =
    s.solids.some((p) => pointInPolygon(r.seed, p)) && !s.voids.some((v) => pointInPolygon(r.seed, v));
  if (inSolid) return { state: 'in-wall', outline: [], holes: [], niches: [] };
  const outline = enclosing(s.loops, r.seed);
  if (!outline) return { state: 'not-enclosed', outline: [], holes: [], niches: [] };
  const holes = s.loops.filter((l) => signedArea(l) < 0 && enclosing(s.loops, probe(l)) === outline);
  const niches = s.niches.filter((_, i) =>
    (s.voids[i] ?? []).some((p) => pointInPolygon(p, outline) || onLoop(p, outline)),
  );
  return { state: 'ok', outline, holes, niches };
}

const onLoop = (p: Vec2, loop: readonly Vec2[]) => loop.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < 0.5);

/** Výška místnosti (mm): od úrovně podlaží k vršku; chyba ve vazbě = konstrukční výška podlaží. */
export function roomHeight(model: Model, r: Room): number {
  try {
    const h = resolveHeight(model, { baseStoreyId: r.storeyId, baseOffset: r.floorOffset ?? 0, top: r.top });
    return h.top - h.bottom;
  } catch {
    return model.storeys[r.storeyId]?.height ?? 0;
  }
}

export function roomGeometry(model: Model, r: Room): RoomGeometry {
  const s = shape(model, r);
  const area = signedArea(s.outline) + s.holes.reduce((a, h) => a + signedArea(h), 0);
  const perimeter = s.outline.length
    ? polygonPerimeter(s.outline) + s.holes.reduce((a, h) => a + polygonPerimeter(h), 0)
    : 0;
  const height = roomHeight(model, r);
  return { ...s, area, perimeter, height, volume: area * height };
}
