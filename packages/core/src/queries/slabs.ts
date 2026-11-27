// Dotazy na desky pro AI (D1): obrys, výšky líců, tloušťka, plocha a obvod; typy desek se skladbou.
import { S } from '../commands/schema.ts';
import type { Model } from '../model/types.ts';
import { polygonArea, slabArea, slabLevels, slabPerimeter } from '../slab/geometry.ts';
import { allSlabs, slabTypeUsage } from '../slab/queries.ts';
import { allSlabOpenings, slabNetArea, slabOpeningsOf } from '../slab-opening/geometry.ts';
import type { Slab } from '../slab/types.ts';
import { defineQuery } from './types.ts';

const r1 = (v: number) => Math.round(v * 10) / 10;

function linkSummary(m: Model, s: Slab) {
  const l = s.link;
  if (!l) return null;
  const locked = !!l.locked;
  if (l.kind === 'room')
    return { kind: 'room', roomId: l.roomId, roomNumber: m.rooms[l.roomId]?.number ?? '', locked };
  return { kind: 'walls', wallIds: l.wallIds, boundary: l.boundary, locked };
}

function summary(m: Model, s: Slab) {
  const lv = slabLevels(m, s);
  return {
    id: s.id,
    storeyId: s.storeyId,
    typeId: s.typeId,
    typeName: m.slabTypes[s.typeId]?.name ?? '',
    slabFunction: s.slabFunction,
    ifcClass: s.ifcClass,
    status: s.status,
    outline: s.outline.map((p) => ({ x: r1(p.x), y: r1(p.y) })),
    topOffset: s.topOffset,
    top: r1(lv.top),
    bottom: r1(lv.bottom),
    thickness: r1(lv.thickness),
    /** Plocha v m² (na 2 desetinná místa) a obvod v mm. */
    area: Math.round(slabArea(s) / 1e4) / 100,
    /** Ostrovy (sloup v místnosti) a vazba obrysu: room / walls / null (ruční); locked = ručně upraveno. */
    holes: (s.holes ?? []).map((h) => h.map((p) => ({ x: r1(p.x), y: r1(p.y) }))),
    link: linkSummary(m, s),
    /** Plocha bez otvorů (m²) a počet otvorů v desce (D3). */
    netArea: Math.round(slabNetArea(m, s) / 1e4) / 100,
    openings: slabOpeningsOf(m, s.id).length,
    perimeter: r1(slabPerimeter(s)),
  };
}

export const slabOpeningList = defineQuery<{ storeyId?: string }, unknown>({
  name: 'slabOpening.list',
  label: 'Otvory v deskách',
  description:
    'Svislé otvory v deskách (prostupy, šachty): obrys (mm), plocha (m²), desky, které vyřízne (hostIds), stav.',
  group: 'Otvor',
  params: S.object({ storeyId: S.id }, []),
  run: (m, p) =>
    allSlabOpenings(m)
      .filter((o) => !p.storeyId || o.storeyId === p.storeyId)
      .map((o) => ({
        id: o.id,
        storeyId: o.storeyId,
        hostIds: o.hostIds,
        status: o.status,
        outline: o.outline.map((q) => ({ x: r1(q.x), y: r1(q.y) })),
        area: Math.round(polygonArea(o.outline) / 1e4) / 100,
      })),
});

export const slabList = defineQuery<{ storeyId?: string }, unknown>({
  name: 'slab.list',
  label: 'Seznam desek',
  description:
    'Desky (stropy a skladby podlah): obrys (mm), horní a spodní líc nad ±0,000 (mm), tloušťka podle ' +
    'skladby, plocha (m²), plocha bez otvorů netArea (m²), počet otvorů a obvod (mm), ostrovy holes a vazbu ' +
    'obrysu link (room = podlaha podle místnosti, walls = podle stěn, null = ruční; locked = ručně upraveno, ' +
    'nepřepočítává se). Volitelně jen jedno podlaží.',
  group: 'Deska',
  params: S.object({ storeyId: S.id }, []),
  run: (m, p) =>
    allSlabs(m)
      .filter((s) => !p.storeyId || s.storeyId === p.storeyId)
      .map((s) => summary(m, s)),
});

export const slabTypeList = defineQuery<Record<string, never>, unknown>({
  name: 'slabType.list',
  label: 'Typy desek',
  description:
    'Typy desek: název, značka, výchozí funkce, nosná, skladba (vrstvy od spodu), tloušťka, počet desek.',
  group: 'Deska',
  params: S.object({}, []),
  run: (m) =>
    Object.values(m.slabTypes).map((t) => {
      const c = m.compositions[t.compositionId];
      return {
        id: t.id,
        name: t.name,
        mark: t.mark,
        slabFunction: t.slabFunction,
        loadBearing: t.loadBearing,
        compositionId: t.compositionId,
        compositionName: c?.name ?? '',
        thickness: c ? c.layers.reduce((s, l) => s + l.thickness, 0) : 0,
        layers: (c?.layers ?? []).map((l) => ({
          material: m.materials[l.materialId]?.name ?? '',
          thickness: l.thickness,
          function: l.function,
        })),
        count: slabTypeUsage(m, t.id),
      };
    }),
});
