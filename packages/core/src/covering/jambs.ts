// Ostění otvoru jako malé plochy (prvky stavby 9): boky, nadpraží, parapet (spodní plocha, ne u dveří)
// a u niky dno. Hloubka ostění: nika celá; průchozí otvor do poloviny tloušťky stěny (okna a dveře
// zatím nejsou – s nimi ostění skončí u rámu, etapa 4). Zatím jen obdélníkový otvor.
import { add, dist, leftNormal, mul, norm, sub, type Vec2 } from '../geometry/index.ts';
import type { Model } from '../model/types.ts';
import type { Room } from '../room/types.ts';
import { wallSection } from '../wall/queries.ts';
import type { Wall } from '../wall/types.ts';
import type { FaceRun } from './faces.ts';
import { verticalPlane, v3, type PlaneFrame } from './frame.ts';
import { clipRect, planePolygon, polygonsArea, rect } from './polygon.ts';
import type { CoveringSurface, JambPart } from './surface-types.ts';
import type { FaceOpening } from './wall-surfaces.ts';
import { zoneBandAt, zoneBands, zonesFor, type ZoneBand } from './zones.ts';

const flat = (origin: Vec2, z: number, u: Vec2, v: Vec2): PlaneFrame => ({
  kind: 'plane',
  origin: v3(origin.x, origin.y, z),
  u: v3(u.x, u.y, 0),
  v: v3(v.x, v.y, 0),
  normal: v3(0, 0, u.x * v.y - u.y * v.x),
});

interface Part {
  readonly part: JambPart;
  readonly frame: PlaneFrame;
  /** Obdélník v rovině (u, v). */
  readonly box: readonly [number, number, number, number];
  /** Svislá část se dělí do zón; vodorovná patří zóně ve výšce `at`. */
  readonly at: number | null;
}

function parts(fo: FaceOpening, run: FaceRun, depth: number, vb: number, vt: number, floorZ: number): Part[] {
  const v0 = Math.max(fo.v0, vb);
  const v1 = Math.min(fo.v1, vt);
  if (v1 - v0 < 1) return [];
  const a = run.at(fo.u0);
  const b = run.at(fo.u1);
  const w = leftNormal(a.dir);
  const len = dist(a.point, b.point);
  const c = norm(sub(b.point, a.point));
  const cw = leftNormal(c);
  const deep = (p: Vec2, n: Vec2) => add(p, mul(n, depth));
  const out: Part[] = [];
  if (fo.u0 > 1)
    out.push({ part: 'left', frame: verticalPlane(a.point, w, floorZ), box: [0, v0, depth, v1], at: null });
  if (fo.u1 < run.length - 1) {
    const wb = leftNormal(b.dir);
    out.push({
      part: 'right',
      frame: verticalPlane(deep(b.point, wb), mul(wb, -1), floorZ),
      box: [0, v0, depth, v1],
      at: null,
    });
  }
  if (fo.v1 < vt - 1) {
    out.push({
      part: 'head',
      frame: flat(deep(a.point, cw), floorZ + fo.v1, c, mul(cw, -1)),
      box: [0, 0, len, depth],
      at: fo.v1 - 1,
    });
  }
  if (fo.v0 > vb + 1)
    out.push({
      part: 'sill',
      frame: flat(a.point, floorZ + fo.v0, c, cw),
      box: [0, 0, len, depth],
      at: fo.v0 + 1,
    });
  if (fo.opening.kind === 'niche') {
    out.push({
      part: 'back',
      frame: verticalPlane(deep(a.point, cw), c, floorZ),
      box: [0, v0, len, v1],
      at: null,
    });
  }
  return out;
}

/** Plochy ostění otvorů úseku líce, rozdělené do zón stěny. */
export function jambSurfaces(
  model: Model,
  room: Room,
  wall: Wall,
  run: FaceRun,
  level: { floorZ: number; vb: number; vt: number },
  openings: readonly FaceOpening[],
): CoveringSurface[] {
  const thickness = wallSection(model, wall).thickness;
  const bands = zoneBands(zonesFor(room, wall.id, run.side), level.vt);
  return openings
    .filter((fo) => fo.opening.profile.kind === 'rect')
    .flatMap((fo) => {
      const o = fo.opening;
      const depth = o.kind === 'niche' ? Math.min(o.depth, thickness) : thickness / 2;
      return parts(fo, run, depth, level.vb, level.vt, level.floorZ).flatMap((p) => {
        const whole = planePolygon(rect(...p.box));
        const pieces: [ZoneBand | undefined, typeof whole][] =
          p.at === null
            ? bands.map((b) => [b, clipRect(whole, rect(p.box[0] - 1, b.v0, p.box[2] + 1, b.v1))])
            : [[zoneBandAt(bands, p.at), whole]];
        return pieces
          .filter(([b, polys]) => b && polys.length)
          .map(([b, polygons]) => ({
            id: `${room.id}/jamb/${o.id}/${p.part}/${b?.index ?? 0}`,
            roomId: room.id,
            storeyId: room.storeyId,
            place: 'jamb' as const,
            wallId: wall.id,
            side: run.side,
            zone: b?.index ?? 0,
            openingId: o.id,
            jambPart: p.part,
            typeId: b?.typeId ?? null,
            polygons,
            frame: p.frame,
            area: polygonsArea(polygons),
            length: 0,
            openings: [],
          }));
      });
    });
}
