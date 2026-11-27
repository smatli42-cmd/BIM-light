// Dotazy na úpravy povrchů (prvky stavby 9) pro AI, 3D okno, rozvinutý pohled a info box místnosti.
// Plochy se počítají v jádře (`covering/surfaces.ts`) – jeden zdroj pro 3D, rozvinutý pohled i výkaz.
import { S } from '../commands/schema.ts';
import { fail } from '../commands/types.ts';
import { surfaceLook } from '../covering/color.ts';
import { allSurfaces, roomSurfaces } from '../covering/surfaces.ts';
import { COVERING_KIND_LABELS } from '../covering/types.ts';
import type { Vec2 } from '../geometry/index.ts';
import type { Model } from '../model/types.ts';
import type { GraphicView } from '../view/types.ts';
import { defineQuery } from './types.ts';

const r1 = (v: number) => Math.round(v * 10) / 10;
const pts = (ps: readonly Vec2[]) => ps.map((p) => ({ x: r1(p.x), y: r1(p.y) }));
const m2 = (mm2: number) => Math.round(mm2 / 1e4) / 100;

function viewOf(m: Model, id: string | undefined): GraphicView | undefined {
  if (!id) return undefined;
  return m.views[id] ?? m.views3d[id] ?? fail('not-found', `Pohled ${id} neexistuje`);
}

export const coveringSurfaces = defineQuery<{ storeyId?: string; roomId?: string; viewId?: string }, unknown>(
  {
    name: 'covering.surfaces',
    label: 'Plochy povrchů',
    description:
      'Spočítané plochy povrchů místností (podlaží, jedné místnosti, nebo celého modelu): place (wall / jamb / ' +
      'floor / ceiling), wallId + side, openingId + jambPart u ostění, zone, typeId, typeName, kind, ' +
      'polygons = obrysy v rovině plochy [{outer, holes}] (u, v v mm), frame = transformace do 3D ' +
      '(plane: origin, u, v, normal; cylinder: center, radius, angle0, dir – bod = center + radius·(cos a, ' +
      'sin a) + v·z, a = angle0 + dir·u/radius), color (#rrggbb přes funkci grafiky v pohledu viewId, jinak ' +
      'barva materiálu; null = bez úpravy), transparency (%), visible, area (m²), length (m, spodní hrana ' +
      'bez dveří – sokl). Normála míří do místnosti.',
    group: 'Povrchy',
    params: S.object({ storeyId: S.id, roomId: S.id, viewId: S.id }, []),
    run(m, p) {
      const view = viewOf(m, p.viewId);
      const list = p.roomId
        ? roomSurfaces(m, m.rooms[p.roomId] ?? fail('not-found', `Místnost ${p.roomId} neexistuje`))
        : allSurfaces(m, p.storeyId);
      return list.flatMap((s) => {
        const room = m.rooms[s.roomId];
        if (!room) return [];
        const type = s.typeId ? m.coveringTypes[s.typeId] : undefined;
        const look = surfaceLook(m, room, s.typeId, view);
        return [
          {
            id: s.id,
            roomId: s.roomId,
            roomNumber: room.number,
            storeyId: s.storeyId,
            place: s.place,
            ...(s.wallId && { wallId: s.wallId, side: s.side }),
            ...(s.openingId && { openingId: s.openingId, jambPart: s.jambPart }),
            ...(s.zone !== undefined && { zone: s.zone }),
            typeId: s.typeId,
            typeName: type?.name ?? null,
            kind: type?.kind ?? null,
            ...look,
            area: m2(s.area),
            length: r1(s.length) / 1000,
            polygons: s.polygons.map((g) => ({ outer: pts(g.outer), holes: g.holes.map(pts) })),
            frame: s.frame,
          },
        ];
      });
    },
  },
);

export const coveringTypeList = defineQuery<Record<string, never>, unknown>({
  name: 'coveringType.list',
  label: 'Typy úprav povrchů',
  description:
    'Typy úprav povrchů (IfcCovering): id, name, kind (paint / plaster / tiling / floor-tiles / flooring / ' +
    'ceiling / skirting) a kindLabel, materialId a materialName, tile (formát mm, spára, barva spáry, ' +
    'zarovnání) u obkladu, dlažby a soklu, used = počet místností, které typ používají.',
  group: 'Povrchy',
  params: S.object({}, []),
  run: (m) =>
    Object.values(m.coveringTypes).map((t) => ({
      id: t.id,
      name: t.name,
      kind: t.kind,
      kindLabel: COVERING_KIND_LABELS[t.kind],
      materialId: t.materialId,
      materialName: m.materials[t.materialId ?? '']?.name ?? null,
      tile: t.tile ?? null,
      used: Object.values(m.rooms).filter((r) => JSON.stringify(r.coverings ?? {}).includes(`"${t.id}"`))
        .length,
    })),
});
