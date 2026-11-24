// Příkaz: smazat uzel (katalog kreslení 5): dvě stěny stejného typu v jedné přímce, spojené
// v uzlu, se sloučí do jedné. Napojení na vzdálených koncích zůstanou.
import { cross, endPoint, tangentAt, type PathEnd } from '../../geometry/index.ts';
import type { Id } from '../../ids/index.ts';
import { dimensionWallIds } from '../../dimension/measure.ts';
import {
  putElements,
  putRelations,
  removeDimensions,
  removeElements,
  removeRelations,
} from '../../model/update.ts';
import type { WallConnection } from '../../relation/types.ts';
import { connectionsOf, endToType, sidesFor, typeToEnd } from '../../wall/queries.ts';
import { wallOf } from '../lookup.ts';
import { S } from '../schema.ts';
import { defineCommand, fail } from '../types.ts';
import { END_SCHEMA } from './shared.ts';

const other = (e: PathEnd): PathEnd => (e === 'start' ? 'end' : 'start');

export const wallDeleteNode = defineCommand<{ wallId: Id; end: PathEnd }>({
  name: 'wall.deleteNode',
  label: 'Smazat uzel',
  description:
    'Sloučí dvě stěny stejného typu, které leží v jedné přímce a jsou spojené v uzlu, do jedné stěny.',
  group: 'Stěna',
  params: S.object({ wallId: S.id, end: END_SCHEMA }, ['wallId', 'end']),
  run(model, p) {
    const a = wallOf(model, p.wallId);
    const here = connectionsOf(model, a.id).filter((c) => sidesFor(c, a.id).own.at === endToType(p.end));
    const conn = here[0];
    const bEnd = conn && typeToEnd(sidesFor(conn, a.id).other.at);
    if (here.length !== 1 || !conn || !bEnd) return fail('invalid', 'Uzel nesdílí právě dvě stěny');
    const b = wallOf(model, sidesFor(conn, a.id).other.wallId);
    if (a.path.kind !== 'line' || b.path.kind !== 'line') fail('invalid', 'Slučovat jde jen přímé stěny');
    if (Math.abs(cross(tangentAt(a.path, 'start'), tangentAt(b.path, 'start'))) > 0.02)
      fail('invalid', 'Stěny nejsou v jedné přímce');
    if (a.typeId !== b.typeId) fail('invalid', 'Stěny mají různý typ');
    const far = endPoint(b.path, other(bEnd));
    const merged = { ...a, path: { ...a.path, [p.end]: far } };
    const moved: WallConnection[] = connectionsOf(model, b.id)
      .filter((c) => c.id !== conn.id)
      .map((c) => {
        const which = c.relating.wallId === b.id ? 'relating' : 'related';
        const at = c[which].at === endToType(other(bEnd)) ? endToType(p.end) : c[which].at;
        return { ...c, [which]: { wallId: a.id, at } };
      });
    let m = removeRelations(model, [conn.id, ...moved.map((c) => c.id)]);
    m = putRelations(putElements(removeElements(m, [b.id]), [merged]), moved);
    const dims = Object.values(m.dimensions).filter((d) => dimensionWallIds(d).includes(b.id));
    m = removeDimensions(
      m,
      dims.map((d) => d.id),
    );
    return { model: m };
  },
});
