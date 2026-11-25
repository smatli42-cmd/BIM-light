// Co stěnu na konci ohraničuje na zvoleném líci (kóty k otvorům, okótování celé stěny, Z4):
// volný konec = čelo stěny; napojený konec = líc napojené stěny, na kterém líc této stěny končí.
// Musí být kolmý na stěnu (rovnoběžný s hranou otvoru), jinak se nekótuje (null).
import { carrierOf, cross, distanceToCarrier, endPoint, tangentAt, type PathEnd } from '../geometry/index.ts';
import type { FaceRef } from '../dimension/types.ts';
import type { Id } from '../ids/index.ts';
import { connectionsAtEnd } from '../junction/nodes.ts';
import type { Model } from '../model/types.ts';
import { wallGeometry } from '../wall/geometry.ts';
import { getWall, sidesFor } from '../wall/queries.ts';
import type { WallFace } from '../wall/types.ts';

const TOL = 0.5;

export function wallEndLimit(model: Model, wallId: Id, end: PathEnd, side: 'ref' | 'opp'): FaceRef | null {
  const wall = getWall(model, wallId);
  const g = wallGeometry(model, wall);
  if (g.cuts[end].join === 'free') return { wallId, face: end };
  const p = endPoint(g.faces[side], end);
  const along = tangentAt(wall.path, end);
  for (const c of connectionsAtEnd(model, wallId, end)) {
    const otherId = sidesFor(c, wallId).other.wallId;
    const og = wallGeometry(model, getWall(model, otherId));
    for (const face of ['ref', 'opp'] as WallFace[]) {
      const path = og.faces[face];
      if (distanceToCarrier(p, carrierOf(path)) > TOL) continue;
      if (Math.abs(cross(tangentAt(path, 'start'), along)) < 0.999) continue;
      return { wallId: otherId, face };
    }
  }
  return null;
}
