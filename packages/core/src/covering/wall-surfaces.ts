// Plochy líce stěny v místnosti (prvky stavby 9): úsek líce rozvinutý do roviny (u po líci, v výška nad
// čistou podlahou), minus otvory (2D rozdíl), rozdělený na výškové zóny. Ostění otvorů přidá `jambs.ts`.
import type { Vec2 } from '../geometry/index.ts';
import type { Model } from '../model/types.ts';
import { pointAtStation } from '../opening/along.ts';
import { openingLevels, openingsOf } from '../opening/geometry.ts';
import type { Opening } from '../opening/types.ts';
import { boundingStatuses } from '../room/bounding.ts';
import type { Room } from '../room/types.ts';
import { wallSection } from '../wall/queries.ts';
import type { Wall } from '../wall/types.ts';
import { wallHeight } from '../wall-height/resolve.ts';
import type { FaceRun } from './faces.ts';
import { withFloor } from './frame.ts';
import { clipRect, difference, planePolygon, polygonsArea, rect } from './polygon.ts';
import type { CoveringSurface } from './surface-types.ts';
import { zoneBands, zonesFor } from './zones.ts';

/** Otvor promítnutý do roviny úseku líce. */
export interface FaceOpening {
  readonly opening: Opening;
  /** Rozsah u a v (v nad čistou podlahou). */
  readonly u0: number;
  readonly u1: number;
  readonly v0: number;
  readonly v1: number;
  /** Obrys otvoru v rovině (u, v). */
  readonly outline: readonly Vec2[];
}

/** Svislý rozsah líce stěny nad čistou podlahou, oříznutý výškou místnosti. */
export function faceHeights(model: Model, wall: Wall, floorZ: number, roomH: number) {
  try {
    const h = wallHeight(model, wall);
    return { vb: Math.max(0, h.bottom - floorZ), vt: Math.min(roomH, h.top - floorZ) };
  } catch {
    return { vb: 0, vt: roomH };
  }
}

/** Otvory stěny, které líc úseku protínají (průchozí; nika jen ze stejné strany). */
export function faceOpenings(
  model: Model,
  room: Room,
  wall: Wall,
  run: FaceRun,
  floorZ: number,
): FaceOpening[] {
  if (run.side !== 'ref' && run.side !== 'opp') return [];
  const statuses = boundingStatuses(room.status);
  const face = wallSection(model, wall).faces[run.side];
  return openingsOf(model, wall.id)
    .filter((o) => statuses.includes(o.status) && (o.kind === 'through' || o.side === run.side))
    .flatMap((o) => {
      const lv = openingLevels(model, o, wall);
      const v0 = lv.bottom - floorZ;
      const v1 = lv.top - floorZ;
      const uAt = (s: number) => run.uOf(pointAtStation(wall.path, s, face));
      const ua = uAt(o.offset);
      const ub = uAt(o.offset + o.width);
      const [u0, u1] = ua <= ub ? [ua, ub] : [ub, ua];
      if (u1 <= 1 || u0 >= run.length - 1) return [];
      const outline =
        o.profile.kind === 'polygon'
          ? o.profile.points.map((p) => ({ x: uAt(o.offset + p.x), y: v0 + p.y }))
          : rect(u0, v0, u1, v1);
      return [{ opening: o, u0, u1, v0, v1, outline }];
    });
}

/** Otvory v pásu zóny (plocha pro pravidlo odečtu) a šířka otvorů u spodní hrany (dveře – sokl). */
function openingShares(openings: readonly FaceOpening[], band: Vec2[], bottom: number, length: number) {
  const cut = openings
    .map((o) => ({ openingId: o.opening.id, area: polygonsArea(clipRect(planePolygon(o.outline), band)) }))
    .filter((o) => o.area > 1);
  const doors = openings
    .filter((o) => o.v0 <= bottom + 1 && o.v1 > bottom)
    .reduce((s, o) => s + Math.min(o.u1, length) - Math.max(o.u0, 0), 0);
  return { cut, doors };
}

/** Plochy úseku líce: obdélník u × v minus otvory, rozdělený do výškových zón. */
export function wallFaceSurfaces(
  model: Model,
  room: Room,
  wall: Wall,
  run: FaceRun,
  runIndex: number,
  level: { floorZ: number; roomH: number },
  openings: readonly FaceOpening[],
): CoveringSurface[] {
  const { vb, vt } = faceHeights(model, wall, level.floorZ, level.roomH);
  if (vt - vb < 1 || run.length < 1) return [];
  const net = difference(
    planePolygon(rect(0, vb, run.length, vt)),
    openings.map((o) => o.outline),
  );
  const frame = withFloor(run.frame, level.floorZ);
  return zoneBands(zonesFor(room, wall.id, run.side), vt)
    .filter((b) => b.v1 > vb)
    .flatMap((b) => {
      const band = rect(-1, Math.max(b.v0, vb), run.length + 1, b.v1);
      const polygons = clipRect(net, band);
      if (!polygons.length) return [];
      const { cut, doors } = openingShares(openings, band, Math.max(b.v0, vb), run.length);
      return [
        {
          id: `${room.id}/wall/${wall.id}:${run.side}/${runIndex}/${b.index}`,
          roomId: room.id,
          storeyId: room.storeyId,
          place: 'wall' as const,
          wallId: wall.id,
          side: run.side,
          run: runIndex,
          faceLength: run.length,
          zone: b.index,
          typeId: b.typeId,
          polygons,
          frame,
          area: polygonsArea(polygons),
          length: Math.max(0, run.length - doors),
          openings: cut,
        },
      ];
    });
}
