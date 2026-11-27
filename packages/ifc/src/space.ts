// Místnost v IFC (prvky stavby 9): IfcSpace (Name = číslo, LongName = název) pod podlažím přes
// IfcRelAggregates. Tělo = spočítaný obrys mezi líci stěn (ostrovy jako vnitřní křivky) vytažený o výšku
// místnosti. Pset_SpaceCommon (Reference, IsExternal, NetPlannedArea, Status) a Qto_SpaceBaseQuantities
// (NetFloorArea, GrossPerimeter, Height, NetVolume). Neuzavřená místnost se zapíše bez tvaru.
import {
  allRoomGeometry,
  areaM2,
  type Id,
  type Model,
  type Room,
  type RoomGeometry,
  type Vec2,
} from '@bim-light/core';
import { placement, point2, type IfcContext } from './context.ts';
import { derivedGlobalId, modelGlobalId } from './guid.ts';
import { bool, en, real, str, typed, type Raw } from './step.ts';

const STATUS = { existing: 'EXISTING', demolished: 'DEMOLISH', new: 'NEW' } as const;
const num = (type: string, v: number) => typed(type, { raw: real(v) });

const loop = (c: IfcContext, pts: readonly Vec2[]): Raw => {
  const ps = pts.map((p) => point2(c.w, p.x, p.y));
  return c.w.add('IfcPolyline', [ps.length ? [...ps, ps[0] as Raw] : ps]);
};

function body(c: IfcContext, g: RoomGeometry): Raw | null {
  if (!g.outline.length || !(g.height > 0)) return null;
  const profile = g.holes.length
    ? c.w.add('IfcArbitraryProfileDefWithVoids', [
        en('AREA'),
        null,
        loop(c, g.outline),
        g.holes.map((h) => loop(c, h)),
      ])
    : c.w.add('IfcArbitraryClosedProfileDef', [en('AREA'), null, loop(c, g.outline)]);
  const up = c.w.add('IfcDirection', [[0, 0, 1]]);
  const solid = c.w.add('IfcExtrudedAreaSolid', [profile, c.origin, up, g.height]);
  const rep = c.w.add('IfcShapeRepresentation', [c.body, str('Body'), str('SweptSolid'), [solid]]);
  return c.w.add('IfcProductDefinitionShape', [null, null, [rep]]);
}

function defines(c: IfcContext, key: string, entity: Raw, def: Raw) {
  c.w.add('IfcRelDefinesByProperties', [str(derivedGlobalId(`${key}-rel`)), null, null, null, [entity], def]);
}

function writeProps(c: IfcContext, r: Room, g: RoomGeometry, entity: Raw) {
  const single = (name: string, v: Raw) => c.w.add('IfcPropertySingleValue', [str(name), null, v, null]);
  const pset = c.w.add('IfcPropertySet', [
    str(derivedGlobalId(`${r.id}/pset`)),
    null,
    str('Pset_SpaceCommon'),
    null,
    [
      single('Reference', typed('IFCIDENTIFIER', str(r.number))),
      single('IsExternal', typed('IFCBOOLEAN', bool(false))),
      single('NetPlannedArea', num('IFCAREAMEASURE', areaM2(g.area))),
      c.w.add('IfcPropertyEnumeratedValue', [
        str('Status'),
        null,
        [typed('IFCLABEL', str(STATUS[r.status]))],
        null,
      ]),
    ],
  ]);
  defines(c, `${r.id}/pset`, entity, pset);
  const q = (cls: string, name: string, v: number) => c.w.add(cls, [str(name), null, null, v, null]);
  const qto = c.w.add('IfcElementQuantity', [
    str(derivedGlobalId(`${r.id}/qto`)),
    null,
    str('Qto_SpaceBaseQuantities'),
    null,
    null,
    [
      q('IfcQuantityArea', 'NetFloorArea', areaM2(g.area)),
      q('IfcQuantityLength', 'GrossPerimeter', g.perimeter),
      q('IfcQuantityLength', 'Height', g.height),
      q('IfcQuantityVolume', 'NetVolume', Math.round(g.volume / 1e6) / 1000),
    ],
  ]);
  defines(c, `${r.id}/qto`, entity, qto);
}

/** Zapíše místnosti hlavního modelu a připojí je k podlažím (IfcRelAggregates). */
export function writeSpaces(
  c: IfcContext,
  m: Model,
  storeys: ReadonlyMap<Id, { entity: Raw; placement: Raw }>,
): void {
  const geo = allRoomGeometry(m);
  const byStorey = new Map<Id, Raw[]>();
  for (const r of Object.values(m.rooms)) {
    const st = storeys.get(r.storeyId);
    const g = geo.get(r.id);
    if (!st || !g || r.variant.kind !== 'main') continue;
    const entity = c.w.add('IfcSpace', [
      str(modelGlobalId(r.id)),
      null,
      str(r.number),
      null,
      null,
      placement(c, st.placement, { x: 0, y: 0, z: 0 }),
      body(c, g),
      str(r.name),
      en('ELEMENT'),
      en('INTERNAL'),
      null,
    ]);
    writeProps(c, r, g, entity);
    byStorey.set(r.storeyId, [...(byStorey.get(r.storeyId) ?? []), entity]);
  }
  for (const [id, spaces] of byStorey) {
    const st = storeys.get(id);
    if (st)
      c.w.add('IfcRelAggregates', [
        str(derivedGlobalId(`${id}/spaces`)),
        null,
        null,
        null,
        st.entity,
        spaces,
      ]);
  }
}
