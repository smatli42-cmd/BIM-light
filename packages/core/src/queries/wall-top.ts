// Dotaz pro AI na vazbu vršku stěn k deskám (desky D4): ke které desce je vršek připojený a která deska
// je nad stěnou (kam by ji připojil wall.attachTop bez slabId).
import { S } from '../commands/schema.ts';
import type { Model } from '../model/types.ts';
import { allWalls } from '../wall/queries.ts';
import type { Wall } from '../wall/types.ts';
import { slabAboveWall } from '../wall-height/attach.ts';
import { wallHeight } from '../wall-height/resolve.ts';
import { defineQuery } from './types.ts';

const r1 = (v: number) => Math.round(v * 10) / 10;

function row(m: Model, w: Wall) {
  const top = w.height.top;
  const h = wallHeight(m, w);
  return {
    wallId: w.id,
    attachedSlabId: top.kind === 'slab' ? top.slabId : null,
    offset: top.kind === 'slab' ? top.offset : null,
    slabAboveId: slabAboveWall(m, w)?.id ?? null,
    top: r1(h.top),
    wallHeight: r1(h.height),
  };
}

export const wallTopSlab = defineQuery<{ storeyId?: string; wallIds?: string[] }, unknown>({
  name: 'wall.topSlab',
  label: 'Vršek stěn k deskám',
  description:
    'Pro každou stěnu: deska, ke které je připojený vršek (attachedSlabId, offset; null = bez vazby), deska ' +
    'nad stěnou (slabAboveId – kam ji připojí wall.attachTop bez slabId), vršek nad ±0 a výška stěny (mm). ' +
    'Volitelně jen podlaží nebo vybrané stěny.',
  group: 'Stěna',
  params: S.object({ storeyId: S.id, wallIds: { type: 'array', items: S.id } }, []),
  run: (m, p) =>
    allWalls(m)
      .filter((w) => (!p.storeyId || w.storeyId === p.storeyId) && (!p.wallIds || p.wallIds.includes(w.id)))
      .map((w) => row(m, w)),
});
