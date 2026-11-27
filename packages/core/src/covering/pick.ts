// Líce stěn místnosti v půdorysu (prvky stavby 9): lomené čáry po obrysu místnosti s odkazem stěna +
// strana – pro výběr líce klikem (přepis zón jedné stěny) a jeho zvýraznění.
import { dist, type Vec2 } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import type { Model } from '../model/types.ts';
import { boundingWalls } from '../room/bounding.ts';
import { roomInfo } from '../room/queries.ts';
import type { Room } from '../room/types.ts';
import { loopRuns } from './faces.ts';
import type { FaceSide } from './types.ts';

export interface RoomFace {
  readonly wallId: Id;
  readonly side: FaceSide;
  /** Body líce po obrysu místnosti (mm). */
  readonly points: readonly Vec2[];
  /** Délka po líci (mm). */
  readonly length: number;
}

/** Líce stěn po obvodu místnosti a kolem ostrovů. */
export function roomFaces(model: Model, room: Room): RoomFace[] {
  const g = roomInfo(model, room);
  if (g.state !== 'ok') return [];
  const walls = boundingWalls(model, room.storeyId, room.status, room.variant);
  return [g.outline, ...g.holes]
    .flatMap((loop) => loopRuns(model, walls, loop))
    .map((r) => ({ wallId: r.wallId, side: r.side, points: r.points, length: r.length }));
}

/** Vzdálenost bodu od úsečky. */
function segDistance(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2)) : 0;
  return dist(p, { x: a.x + dx * t, y: a.y + dy * t });
}

/** Líc místnosti nejblíž bodu (do vzdálenosti `tol` mm), nebo null. */
export function faceAt(model: Model, room: Room, p: Vec2, tol: number): RoomFace | null {
  let best: { f: RoomFace; d: number } | null = null;
  for (const f of roomFaces(model, room)) {
    for (let i = 1; i < f.points.length; i++) {
      const d = segDistance(p, f.points[i - 1] as Vec2, f.points[i] as Vec2);
      if (d <= tol && (!best || d < best.d)) best = { f, d };
    }
  }
  return best?.f ?? null;
}
