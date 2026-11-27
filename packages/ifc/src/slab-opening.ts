// Otvor v desce v IFC (D3; základ 19): IfcOpeningElement s tělem = obrys otvoru vytažený přes tloušťku
// desky (přesah 1 mm na obě strany) a IfcRelVoidsElement k desce. Jeden otvor modelu prořízne víc desek
// (strop i podlahu); IFC dovoluje jen jednoho hostitele na IfcOpeningElement, proto se zapíše po jednom
// pro každou desku: první s GlobalId otvoru, další s odvozeným.
import { allSlabOpenings, type Id, type Model, type SlabOpening } from '@bim-light/core';
import { placement, point2, type IfcContext } from './context.ts';
import { derivedGlobalId, modelGlobalId } from './guid.ts';
import type { SlabEntity } from './slab.ts';
import { en, str, type Raw } from './step.ts';

const OVER = 1;

function body(c: IfcContext, o: SlabOpening, thickness: number): Raw {
  const pts = o.outline.map((p) => point2(c.w, p.x, p.y));
  const loop = c.w.add('IfcPolyline', [[...pts, pts[0] as Raw]]);
  const profile = c.w.add('IfcArbitraryClosedProfileDef', [en('AREA'), null, loop]);
  const at = c.w.add('IfcAxis2Placement3D', [c.w.add('IfcCartesianPoint', [[0, 0, -OVER]]), null, null]);
  const up = c.w.add('IfcDirection', [[0, 0, 1]]);
  const solid = c.w.add('IfcExtrudedAreaSolid', [profile, at, up, thickness + 2 * OVER]);
  const rep = c.w.add('IfcShapeRepresentation', [c.body, str('Body'), str('SweptSolid'), [solid]]);
  return c.w.add('IfcProductDefinitionShape', [null, null, [rep]]);
}

/** Zapíše otvory v deskách hlavního modelu a jejich vztah k deskám. */
export function writeSlabOpenings(c: IfcContext, m: Model, slabs: ReadonlyMap<Id, SlabEntity>): void {
  for (const o of allSlabOpenings(m)) {
    if (o.variant.kind !== 'main') continue;
    o.hostIds.forEach((hostId, i) => {
      const host = slabs.get(hostId);
      if (!host) return;
      const key = `${o.id}/${hostId}`;
      const entity = c.w.add('IfcOpeningElement', [
        str(i === 0 ? modelGlobalId(o.id) : derivedGlobalId(key)),
        null,
        str('Otvor v desce'),
        null,
        null,
        placement(c, host.placement, { x: 0, y: 0, z: 0 }),
        body(c, o, host.thickness),
        null,
        en('OPENING'),
      ]);
      c.w.add('IfcRelVoidsElement', [
        str(derivedGlobalId(`${key}/voids`)),
        null,
        null,
        null,
        host.entity,
        entity,
      ]);
    });
  }
}
