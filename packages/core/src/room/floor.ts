// Podlaha místnosti pod otvorem dveří (prvky stavby 9, základ 14): místnost podle ČSN 73 4301 končí v líci
// stěny (plocha bez otvoru), ale podlaha – vázaná deska, povrch podlahy i spárořez – vede i do průchozího
// otvoru až k podlaze. Výchozí dělení: každá místnost do dělicí linie (`floorLine`, dnes osa stěny; s dveřmi
// linie křídla / zárubně), volba otvoru `floorSplit` dá proužek celý jedné straně nebo žádné.
import { offsetPath, pathLength, pointAt, type Vec2 } from '../geometry/index.ts';
import type { Model } from '../model/types.ts';
import type { Opening, OpeningSide } from '../opening/types.ts';
import { pointInPolygon } from '../selection/pick.ts';
import { polygonPerimeter, signedArea } from '../slab/geometry.ts';
import { wallGeometry } from '../wall/geometry.ts';
import type { Wall } from '../wall/types.ts';
import { union, type PlanePolygon } from '../covering/polygon.ts';
import { boundingStatuses, boundingWalls, subPath } from './bounding.ts';
import type { RoomGeometry } from './geometry.ts';
import type { Room } from './types.ts';

/** Otvor, pod kterým vede podlaha: průchozí, až k podlaze, ve stavu, který místnost vidí. */
export const floorOpening = (o: Opening, room: Room): boolean =>
  o.kind === 'through' && o.sill <= 1 && boundingStatuses(room.status).includes(o.status);

/**
 * Dělicí linie podlahy v otvoru jako odsazení od referenční čáry stěny (mm). Dnes osa stěny; až budou
 * dveře, vrátí linii křídla nebo zárubně.
 */
export const floorLine = (model: Model, w: Wall, _o: Opening): number =>
  wallGeometry(model, w, Number.NEGATIVE_INFINITY).section.faces.axis;

/** Pruh po délce otvoru mezi dvěma odsazeními od referenční čáry. */
function band(w: Wall, o: Opening, a: number, b: number): Vec2[] {
  const len = pathLength(w.path) || 1;
  const [t0, t1] = [o.offset / len, (o.offset + o.width) / len];
  return [...subPath(offsetPath(w.path, a), t0, t1), ...subPath(offsetPath(w.path, b), t0, t1).reverse()];
}

const inside = (g: RoomGeometry, p: Vec2) =>
  pointInPolygon(p, g.outline) && !g.holes.some((h) => pointInPolygon(p, h));

/** Proužek podlahy otvoru pro místnost, která leží u líce `side` (nebo null). */
function stripFor(model: Model, w: Wall, o: Opening, side: OpeningSide): Vec2[] | null {
  const split = o.floorSplit ?? 'split';
  if (split === 'none' || (split !== 'split' && split !== side)) return null;
  const faces = wallGeometry(model, w, Number.NEGATIVE_INFINITY).section.faces;
  const out = Math.sign(faces[side] - faces.axis) || 1;
  const end = split === 'split' ? floorLine(model, w, o) : faces[side === 'ref' ? 'opp' : 'ref'];
  // 1 mm přesah do místnosti, aby se proužek s obrysem spojil v jeden mnohoúhelník.
  return band(w, o, faces[side] + out, end);
}

/** Proužky podlahy v otvorech, které patří místnosti (strana = líc, u kterého místnost leží). */
export function floorStrips(model: Model, room: Room, g: RoomGeometry): Vec2[][] {
  if (g.state !== 'ok' || !g.outline.length) return [];
  const out: Vec2[][] = [];
  for (const w of boundingWalls(model, room.storeyId, room.status, room.variant)) {
    const faces = wallGeometry(model, w, Number.NEGATIVE_INFINITY).section.faces;
    const len = pathLength(w.path) || 1;
    for (const o of Object.values(model.openings)) {
      if (o.hostId !== w.id || !floorOpening(o, room)) continue;
      for (const side of ['ref', 'opp'] as const) {
        const away = Math.sign(faces[side] - faces.axis) || 1;
        const probe = pointAt(offsetPath(w.path, faces[side] + away * 5), (o.offset + o.width / 2) / len);
        const strip = inside(g, probe) ? stripFor(model, w, o, side) : null;
        if (strip) out.push(strip);
      }
    }
  }
  return out;
}

export interface FloorShape {
  readonly outline: readonly Vec2[];
  readonly holes: readonly (readonly Vec2[])[];
  /** Plocha podlahy (mm²) včetně proužků v otvorech. */
  readonly area: number;
  readonly perimeter: number;
}

const polyArea = (p: PlanePolygon) =>
  Math.abs(signedArea(p.outer)) - p.holes.reduce((a, h) => a + Math.abs(signedArea(h)), 0);

/** Obrys podlahy místnosti: obrys místnosti + proužky v otvorech (bez proužků = obrys místnosti). */
export function roomFloorShape(model: Model, room: Room, g: RoomGeometry): FloorShape {
  const strips = floorStrips(model, room, g);
  if (!strips.length) return g;
  const merged = union([{ outer: g.outline, holes: g.holes }], strips);
  const main = merged.reduce<PlanePolygon | undefined>(
    (a, p) => (!a || polyArea(p) > polyArea(a) ? p : a),
    undefined,
  );
  if (!main) return g;
  const outline = signedArea(main.outer) < 0 ? [...main.outer].reverse() : main.outer;
  const perimeter = polygonPerimeter(outline) + main.holes.reduce((a, h) => a + polygonPerimeter(h), 0);
  return { outline, holes: main.holes, area: polyArea(main), perimeter };
}
