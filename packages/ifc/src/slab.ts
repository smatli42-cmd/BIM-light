// Deska v IFC (D1): nosná deska = IfcSlab (FLOOR) + IfcSlabType, skladba podlahy = IfcCovering (FLOORING)
// + IfcCoveringType. Tělo = obrys vytažený nahoru o tloušťku skladby od spodního líce; skladba typu je
// IfcMaterialLayerSet (vrstvy od spodu), instance IfcMaterialLayerSetUsage ve směru AXIS3 (nahoru).
import {
  slabLevels,
  type Id,
  type Model,
  type Slab,
  type SlabFunction,
  type SlabType,
  type Status,
} from '@bim-light/core';
import { placement, point2, type IfcContext } from './context.ts';
import { derivedGlobalId, modelGlobalId } from './guid.ts';
import { LAYER_CATEGORY, material } from './materials.ts';
import { bool, en, str, typed, type Raw } from './step.ts';

const STATUS: Record<Status, string> = { existing: 'EXISTING', demolished: 'DEMOLISH', new: 'NEW' };

interface SlabTypeRefs {
  readonly layerSet: Raw;
  readonly type: Raw;
}

const isFloor = (t: { slabFunction: SlabFunction }) => t.slabFunction === 'floor';

const relMaterial = (c: IfcContext, key: string, objects: Raw[], mat: Raw) =>
  c.w.add('IfcRelAssociatesMaterial', [
    str(derivedGlobalId(`${key}/material`)),
    null,
    null,
    null,
    objects,
    mat,
  ]);

/** Typ desky; třída podle funkce desek, které ho používají (deska typu „podlaha“ jako strop = IfcSlabType). */
function writeSlabType(
  c: IfcContext,
  m: Model,
  t: SlabType,
  fn: SlabFunction,
  mats: Map<Id, Raw>,
): SlabTypeRefs {
  const kind = { slabFunction: fn };
  const key = fn === t.slabFunction ? t.id : `${t.id}/${fn}`;
  const comp = m.compositions[t.compositionId];
  const layers = (comp?.layers ?? []).map((l) =>
    c.w.add('IfcMaterialLayer', [
      material(c, m, mats, l.materialId),
      l.thickness,
      bool(false),
      str(m.materials[l.materialId]?.name ?? ''),
      null,
      str(LAYER_CATEGORY[l.function]),
      null,
    ]),
  );
  const layerSet = c.w.add('IfcMaterialLayerSet', [layers, str(t.name), null]);
  const cls = isFloor(kind) ? 'IfcCoveringType' : 'IfcSlabType';
  const type = c.w.add(cls, [
    str(key === t.id ? modelGlobalId(t.id) : derivedGlobalId(key)),
    null,
    str(t.name),
    null,
    null,
    null,
    null,
    str(t.mark),
    null,
    en(isFloor(kind) ? 'FLOORING' : 'FLOOR'),
  ]);
  relMaterial(c, key, [type], layerSet);
  return { layerSet, type };
}

/** Pset_SlabCommon / Pset_CoveringCommon instance: Reference, Status, u desky LoadBearing. */
function writePset(c: IfcContext, m: Model, s: Slab, entity: Raw, reference: string) {
  const props: Raw[] = [
    c.w.add('IfcPropertySingleValue', [str('Reference'), null, typed('IFCIDENTIFIER', str(reference)), null]),
    c.w.add('IfcPropertyEnumeratedValue', [
      str('Status'),
      null,
      [typed('IFCLABEL', str(STATUS[s.status]))],
      null,
    ]),
  ];
  if (!isFloor(s)) {
    const lb = m.slabTypes[s.typeId]?.loadBearing ?? false;
    props.push(
      c.w.add('IfcPropertySingleValue', [str('LoadBearing'), null, typed('IFCBOOLEAN', bool(lb)), null]),
    );
  }
  const name = isFloor(s) ? 'Pset_CoveringCommon' : 'Pset_SlabCommon';
  const pset = c.w.add('IfcPropertySet', [
    str(derivedGlobalId(`${s.id}/pset`)),
    null,
    str(name),
    null,
    props,
  ]);
  c.w.add('IfcRelDefinesByProperties', [
    str(derivedGlobalId(`${s.id}/pset-rel`)),
    null,
    null,
    null,
    [entity],
    pset,
  ]);
}

function body(c: IfcContext, s: Slab, thickness: number): Raw {
  const pts = s.outline.map((p) => point2(c.w, p.x, p.y));
  const first = pts[0];
  const curve = c.w.add('IfcPolyline', [first ? [...pts, first] : pts]);
  const profile = c.w.add('IfcArbitraryClosedProfileDef', [en('AREA'), null, curve]);
  const up = c.w.add('IfcDirection', [[0, 0, 1]]);
  const solid = c.w.add('IfcExtrudedAreaSolid', [profile, c.origin, up, thickness]);
  const rep = c.w.add('IfcShapeRepresentation', [c.body, str('Body'), str('SweptSolid'), [solid]]);
  return c.w.add('IfcProductDefinitionShape', [null, null, [rep]]);
}

function writeSlab(
  c: IfcContext,
  m: Model,
  s: Slab,
  storey: { placement: Raw; elevation: number },
  t: SlabTypeRefs,
): Raw {
  const lv = slabLevels(m, s);
  const name = m.slabTypes[s.typeId]?.name ?? 'Deska';
  const place = placement(c, storey.placement, { x: 0, y: 0, z: lv.bottom - storey.elevation });
  const entity = c.w.add(isFloor(s) ? 'IfcCovering' : 'IfcSlab', [
    str(modelGlobalId(s.id)),
    null,
    str(name),
    null,
    str(name),
    place,
    body(c, s, lv.thickness),
    null,
    en(isFloor(s) ? 'FLOORING' : 'FLOOR'),
  ]);
  const usage = c.w.add('IfcMaterialLayerSetUsage', [t.layerSet, en('AXIS3'), en('POSITIVE'), 0, null]);
  relMaterial(c, s.id, [entity], usage);
  writePset(c, m, s, entity, name);
  return entity;
}

/** Zapíše desky; vrací entity po podlažích a po typech (pro vztahy). */
export function writeSlabs(
  c: IfcContext,
  m: Model,
  slabs: readonly Slab[],
  storeys: ReadonlyMap<Id, { placement: Raw; elevation: number }>,
): { byStorey: Map<Id, Raw[]>; byType: Map<string, { type: Raw; els: Raw[] }> } {
  const mats = new Map<Id, Raw>();
  const types = new Map<Id, SlabTypeRefs>();
  const byStorey = new Map<Id, Raw[]>();
  const byType = new Map<string, { type: Raw; els: Raw[] }>();
  for (const s of slabs) {
    const st = storeys.get(s.storeyId);
    const tt = m.slabTypes[s.typeId];
    if (!st || !tt) continue;
    const key = `${tt.id}/${s.slabFunction}`;
    if (!types.has(key)) types.set(key, writeSlabType(c, m, tt, s.slabFunction, mats));
    const refs = types.get(key);
    if (!refs) continue;
    const e = writeSlab(c, m, s, st, refs);
    byStorey.set(s.storeyId, [...(byStorey.get(s.storeyId) ?? []), e]);
    byType.set(key, { type: refs.type, els: [...(byType.get(key)?.els ?? []), e] });
  }
  return { byStorey, byType };
}
