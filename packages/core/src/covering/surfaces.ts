// Plochy povrchů místnosti (prvky stavby 9, základ 14) – jeden zdroj pro 3D, rozvinutý pohled i výkaz:
// líce stěn po obvodu i kolem ostrovů (minus otvory, po zónách), ostění, podlaha a strop z obrysu.
// Vždy se počítá z modelu; výsledek se pamatuje pro daný model (každá změna je nový model).
import type { Vec2 } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import type { Model } from '../model/types.ts';
import { boundingWalls } from '../room/bounding.ts';
import { roomFloorShape } from '../room/floor.ts';
import { roomInfo } from '../room/queries.ts';
import type { Room } from '../room/types.ts';
import type { Wall } from '../wall/types.ts';
import { loopRuns } from './faces.ts';
import { horizontalPlane } from './frame.ts';
import { jambSurfaces } from './jambs.ts';
import type { PlanePolygon } from './polygon.ts';
import type { CoveringSurface } from './surface-types.ts';
import { faceHeights, faceOpenings, wallFaceSurfaces } from './wall-surfaces.ts';

const cache = new WeakMap<Model, Map<Id, CoveringSurface[]>>();

const flipY = (pts: readonly Vec2[]) => pts.map((p) => ({ x: p.x, y: -p.y })).reverse();

function flatSurface(
  room: Room,
  place: 'floor' | 'ceiling',
  shape: { outline: readonly Vec2[]; holes: readonly (readonly Vec2[])[]; area: number; perimeter: number },
  z: number,
): CoveringSurface {
  const up = place === 'floor';
  const poly: PlanePolygon = up
    ? { outer: shape.outline, holes: shape.holes }
    : { outer: flipY(shape.outline), holes: shape.holes.map(flipY) };
  return {
    id: `${room.id}/${place}`,
    roomId: room.id,
    storeyId: room.storeyId,
    place,
    typeId: (up ? room.coverings?.floor : room.coverings?.ceiling) ?? null,
    polygons: [poly],
    frame: horizontalPlane(z, up),
    area: shape.area,
    length: up ? shape.perimeter : 0,
    openings: [],
  };
}

function compute(model: Model, room: Room): CoveringSurface[] {
  const g = roomInfo(model, room);
  if (g.state !== 'ok' || !g.outline.length) return [];
  const floorZ = (model.storeys[room.storeyId]?.elevation ?? 0) + (room.floorOffset ?? 0);
  const walls = boundingWalls(model, room.storeyId, room.status, room.variant);
  const byId = new Map(walls.map((w) => [w.id, w]));
  const count = new Map<string, number>();
  const sides = [g.outline, ...g.holes].flatMap((loop) => loopRuns(model, walls, loop));
  const wallSurfaces = sides.flatMap((run) => {
    const wall = byId.get(run.wallId) as Wall;
    const key = `${run.wallId}:${run.side}`;
    const index = count.get(key) ?? 0;
    count.set(key, index + 1);
    const fos = faceOpenings(model, room, wall, run, floorZ);
    const { vb, vt } = faceHeights(model, wall, floorZ, g.height);
    return [
      ...wallFaceSurfaces(model, room, wall, run, index, { floorZ, roomH: g.height }, fos),
      ...jambSurfaces(model, room, wall, run, { floorZ, vb, vt }, fos),
    ];
  });
  return [
    // Podlaha i pod otvory dveří (proužky v otvorech); obvod (sokl) zůstává podle místnosti.
    flatSurface(room, 'floor', { ...roomFloorShape(model, room, g), perimeter: g.perimeter }, floorZ),
    ...wallSurfaces,
    flatSurface(room, 'ceiling', g, floorZ + g.height),
  ];
}

/** Plochy povrchů jedné místnosti (prázdné u neuzavřené / nadbytečné místnosti). */
export function roomSurfaces(model: Model, room: Room): CoveringSurface[] {
  const m = cache.get(model) ?? new Map<Id, CoveringSurface[]>();
  cache.set(model, m);
  const hit = m.get(room.id);
  if (hit) return hit;
  const s = compute(model, room);
  m.set(room.id, s);
  return s;
}

/** Plochy všech místností modelu nebo podlaží. */
export const allSurfaces = (model: Model, storeyId?: Id): CoveringSurface[] =>
  Object.values(model.rooms)
    .filter((r) => storeyId === undefined || r.storeyId === storeyId)
    .flatMap((r) => roomSurfaces(model, r));
