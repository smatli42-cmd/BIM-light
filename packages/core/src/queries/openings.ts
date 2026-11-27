// Dotaz na otvory pro AI (plán stěn Z4): poloha po stěně, rozměry, výšky, vztah k rovině řezu
// a upozornění (otvor těsně u rohu).
import { S } from '../commands/schema.ts';
import type { Model } from '../model/types.ts';
import { cutRelation, openingLevels } from '../opening/geometry.ts';
import type { Opening } from '../opening/types.ts';
import { openingWarnings } from '../opening/warnings.ts';
import { DEFAULT_CUT_HEIGHT } from '../wall/layers.ts';
import { getWall } from '../wall/queries.ts';
import { defineQuery } from './types.ts';

const r1 = (v: number) => Math.round(v * 10) / 10;

function summary(m: Model, o: Opening, cutPlane: number) {
  const host = getWall(m, o.hostId);
  const lv = openingLevels(m, o, host);
  return {
    id: o.id,
    hostId: o.hostId,
    storeyId: o.storeyId,
    kind: o.kind,
    offset: r1(o.offset),
    width: o.width,
    height: o.height,
    sill: o.sill,
    ...(o.kind === 'niche' ? { depth: o.depth, side: o.side } : {}),
    // Podlaha v otvoru až k podlaze (split / ref / opp / none).
    ...(o.kind === 'through' && o.sill <= 1 ? { floorSplit: o.floorSplit ?? 'split' } : {}),
    status: o.status,
    bottom: r1(lv.bottom),
    top: r1(lv.top),
    plan: cutRelation(m, o, host, cutPlane),
    warnings: openingWarnings(m, o),
  };
}

export const openingList = defineQuery<{ wallId?: string; storeyId?: string; viewId?: string }, unknown>({
  name: 'opening.list',
  label: 'Seznam otvorů',
  description:
    'Vrátí otvory (volitelně jedné stěny nebo podlaží): id, hostitelská stěna, druh (through = průchozí, ' +
    'niche = nika s hloubkou a stranou), offset = vzdálenost počátku od začátku referenční čáry (mm), ' +
    'šířka, výška, parapet nad spodkem stěny, spodní a horní hrana nad ±0 (bottom, top), plan = vztah k ' +
    'rovině řezu pohledu viewId (cut = přeruší stěnu, above / below = čárkovaně), u otvoru k podlaze ' +
    'floorSplit (podlaha v otvoru, viz opening.setFloorSplit) a upozornění.',
  group: 'Otvor',
  params: S.object({ wallId: S.id, storeyId: S.id, viewId: S.id }, []),
  run(m, p) {
    const cut = (p.viewId ? m.views[p.viewId]?.cutPlane : undefined) ?? DEFAULT_CUT_HEIGHT;
    return Object.values(m.openings)
      .filter((o) => (!p.wallId || o.hostId === p.wallId) && (!p.storeyId || o.storeyId === p.storeyId))
      .sort((a, b) => a.hostId.localeCompare(b.hostId) || a.offset - b.offset)
      .map((o) => summary(m, o, cut));
  },
});
