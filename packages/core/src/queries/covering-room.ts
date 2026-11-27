// Dotaz na povrchy jedné místnosti (info box, AI): zóny stěn místnosti, podlaha, strop a seznam líců stěn
// v místnosti s přepisem zón a plochami po typech úprav.
import { S } from '../commands/schema.ts';
import { fail } from '../commands/types.ts';
import { roomSurfaces } from '../covering/surfaces.ts';
import { NO_ZONES } from '../covering/types.ts';
import { hasOverride, zonesFor } from '../covering/zones.ts';
import type { Model } from '../model/types.ts';
import { defineQuery } from './types.ts';

const m2 = (mm2: number) => Math.round(mm2 / 1e4) / 100;
const typeName = (m: Model, id: string | null | undefined) =>
  id ? (m.coveringTypes[id]?.name ?? null) : null;

/** Součty ploch po typech úprav (m²). */
function byType(m: Model, list: readonly { typeId: string | null; area: number }[]) {
  const out = new Map<string | null, number>();
  for (const s of list) out.set(s.typeId, (out.get(s.typeId) ?? 0) + s.area);
  return [...out].map(([typeId, area]) => ({ typeId, typeName: typeName(m, typeId), area: m2(area) }));
}

export const coveringRoom = defineQuery<{ roomId: string }, unknown>({
  name: 'covering.room',
  label: 'Povrchy místnosti',
  description:
    'Úpravy povrchů místnosti: wallZones (zóny stěn celé místnosti odspodu, top v mm nad čistou podlahou, ' +
    'null = ke stropu), floor a ceiling (typ), faces = líce stěn v místnosti (wallId, side, length v m, ' +
    'override = vlastní zóny stěny, nebo null, zones = platné zóny), totals = m² po typech pro stěny ' +
    '(včetně ostění), podlahu a strop.',
  group: 'Povrchy',
  params: S.object({ roomId: S.id }, ['roomId']),
  run(m, p) {
    const room = m.rooms[p.roomId] ?? fail('not-found', `Místnost ${p.roomId} neexistuje`);
    const list = roomSurfaces(m, room);
    const faces = new Map<string, { wallId: string; side: string; length: number }>();
    for (const s of list) {
      if (s.place !== 'wall' || !s.wallId || !s.side) continue;
      const key = `${s.wallId}:${s.side}:${s.run}`;
      if (!faces.has(key)) faces.set(key, { wallId: s.wallId, side: s.side, length: s.faceLength ?? 0 });
    }
    const c = room.coverings ?? {};
    return {
      roomId: room.id,
      wallZones: c.wallZones ?? NO_ZONES,
      floor: c.floor ?? null,
      floorName: typeName(m, c.floor),
      ceiling: c.ceiling ?? null,
      ceilingName: typeName(m, c.ceiling),
      faces: [...faces.values()].map((f) => {
        const side = f.side as 'ref' | 'opp' | 'start' | 'end';
        const own = hasOverride(room, f.wallId, side);
        const zones = zonesFor(room, f.wallId, side);
        return { ...f, length: Math.round(f.length) / 1000, override: own ? zones : null, zones };
      }),
      totals: {
        walls: byType(
          m,
          list.filter((s) => s.place === 'wall' || s.place === 'jamb'),
        ),
        floor: byType(
          m,
          list.filter((s) => s.place === 'floor'),
        ),
        ceiling: byType(
          m,
          list.filter((s) => s.place === 'ceiling'),
        ),
      },
    };
  },
});
