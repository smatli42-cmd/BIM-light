// Prostorová struktura IFC: projekt → pozemek → budova → podlaží (základ 1).
// Pozemek model nemá; v IFC je obvyklý, proto vznikne jeden se stabilním GlobalId.
import { storeysOf, type Building, type Id, type Model } from '@bim-light/core';
import { placement, type IfcContext } from './context.ts';
import { derivedGlobalId, modelGlobalId } from './guid.ts';
import { en, str, type Raw } from './step.ts';

export interface SpatialRefs {
  readonly project: Raw;
  /** Podlaží: entita a její umístění (stěny se umisťují vůči němu). */
  readonly storeys: ReadonlyMap<
    Id,
    { readonly entity: Raw; readonly placement: Raw; readonly elevation: number }
  >;
}

const gid = (id: string) => str(modelGlobalId(id));

function aggregate(c: IfcContext, key: string, parent: Raw, children: Raw[]) {
  if (children.length === 0) return;
  c.w.add('IfcRelAggregates', [str(derivedGlobalId(key)), null, null, null, parent, children]);
}

type StoreyRef = { entity: Raw; placement: Raw; elevation: number };

function writeSite(c: IfcContext, m: Model, project: Raw): { site: Raw; placement: Raw } {
  const p = m.project;
  const sitePlacement = placement(c, null, { x: 0, y: 0, z: 0 });
  const site = c.w.add('IfcSite', [
    str(derivedGlobalId(`${p.id}/site`)),
    null,
    str('Pozemek'),
    null,
    null,
    sitePlacement,
    null,
    null,
    en('ELEMENT'),
    null,
    null,
    p.georef.elevationBpv * 1000,
    null,
    null,
  ]);
  aggregate(c, `${p.id}/project-site`, project, [site]);
  return { site, placement: sitePlacement };
}

function writeBuilding(c: IfcContext, m: Model, b: Building, parent: Raw, out: Map<Id, StoreyRef>): Raw {
  const bPlace = placement(c, parent, { x: 0, y: 0, z: 0 });
  const bpv = m.project.georef.elevationBpv * 1000;
  const building = c.w.add('IfcBuilding', [
    gid(b.id),
    null,
    str(b.name),
    null,
    null,
    bPlace,
    null,
    null,
    en('ELEMENT'),
    bpv,
    null,
    null,
  ]);
  const list = storeysOf(m, b.id).map((s) => {
    const sPlace = placement(c, bPlace, { x: 0, y: 0, z: s.elevation });
    const entity = c.w.add('IfcBuildingStorey', [
      gid(s.id),
      null,
      str(s.name),
      null,
      null,
      sPlace,
      null,
      null,
      en('ELEMENT'),
      s.elevation,
    ]);
    out.set(s.id, { entity, placement: sPlace, elevation: s.elevation });
    return entity;
  });
  aggregate(c, `${b.id}/building-storeys`, building, list);
  return building;
}

export function writeSpatial(c: IfcContext, m: Model): SpatialRefs {
  const p = m.project;
  const project = c.w.add('IfcProject', [
    gid(p.id),
    null,
    str(p.name),
    null,
    null,
    null,
    null,
    [c.model],
    c.units,
  ]);
  const site = writeSite(c, m, project);
  const storeys = new Map<Id, StoreyRef>();
  const buildings = Object.values(m.buildings).map((b) => writeBuilding(c, m, b, site.placement, storeys));
  aggregate(c, `${p.id}/site-buildings`, site.site, buildings);
  return { project, storeys };
}
