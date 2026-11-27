// Dotazy na desky pro AI (D1): obrys, výšky líců, tloušťka, plocha a obvod; typy desek se skladbou.
import { S } from '../commands/schema.ts';
import type { Model } from '../model/types.ts';
import { polygonArea, polygonPerimeter, slabLevels } from '../slab/geometry.ts';
import { allSlabs, slabTypeUsage } from '../slab/queries.ts';
import type { Slab } from '../slab/types.ts';
import { defineQuery } from './types.ts';

const r1 = (v: number) => Math.round(v * 10) / 10;

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
    area: Math.round(polygonArea(s.outline) / 1e4) / 100,
    perimeter: r1(polygonPerimeter(s.outline)),
  };
}

export const slabList = defineQuery<{ storeyId?: string }, unknown>({
  name: 'slab.list',
  label: 'Seznam desek',
  description:
    'Desky (stropy a skladby podlah): obrys (mm), horní a spodní líc nad ±0,000 (mm), tloušťka podle ' +
    'skladby, plocha (m²) a obvod (mm). Volitelně jen jedno podlaží.',
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
