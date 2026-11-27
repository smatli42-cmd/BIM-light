// Místnost elektro prvku se nepamatuje, počítá se z polohy (koncepce 3: „místnost automaticky“, základ 4):
// prvek na stěně = bod kousek před lícem do místnosti, volný prvek = jeho bod.
import { add, mul } from '../geometry/index.ts';
import type { Model } from '../model/types.ts';
import type { Room } from '../room/types.ts';
import { allRoomGeometry } from '../room/queries.ts';
import { pointInPolygon } from '../selection/pick.ts';
import { electroFrame } from './place.ts';
import type { ElectroElement } from './types.ts';

/** Jak daleko před lícem se hledá místnost (mm). */
const PROBE = 50;

export function electroRoom(m: Model, el: ElectroElement): Room | undefined {
  const f = electroFrame(m, el);
  if (!f) return undefined;
  const p = el.host.kind === 'wall' ? add(f.origin, mul(f.ey, PROBE)) : f.origin;
  const geo = allRoomGeometry(m, el.storeyId);
  return Object.values(m.rooms).find((r) => {
    const g = r.storeyId === el.storeyId ? geo.get(r.id) : undefined;
    return !!g && pointInPolygon(p, g.outline) && !g.holes.some((h) => pointInPolygon(p, h));
  });
}
