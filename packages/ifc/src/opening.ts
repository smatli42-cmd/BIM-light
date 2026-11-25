// Otvor v IFC (plán stěn Z4): IfcOpeningElement s tělem = kvádr v místních souřadnicích stěny
// (x po stěně, y příčně, z od spodku stěny) a IfcRelVoidsElement ke stěně. Průchozí otvor jde přes celou
// tloušťku s přesahem 1 mm, nika (neprůchozí otvor, PredefinedType RECESS) jen do své hloubky.
import {
  openingAcross,
  openingsOf,
  openingSpan,
  pointAtStation,
  type Model,
  type Opening,
  type Vec2,
  type Wall,
} from '@bim-light/core';
import { placement, point2, type IfcContext } from './context.ts';
import { derivedGlobalId, modelGlobalId } from './guid.ts';
import { en, str, type Raw } from './step.ts';

const OVER = 1;

function body(c: IfcContext, m: Model, o: Opening, wall: Wall, to: (p: Vec2) => [number, number]): Raw {
  const host = wall.path;
  const { s0, s1 } = openingSpan(o);
  const [a, b] = openingAcross(m, o);
  // Přesah jen ven z líce (u niky jen na její straně), aby výřez nenechal tenkou blánu.
  const overA = Math.sign(a - b) * OVER;
  const overB = o.kind === 'niche' ? 0 : Math.sign(b - a) * OVER;
  const lo = Math.min(a + overA, b + overB);
  const hi = Math.max(a + overA, b + overB);
  const quad = [
    pointAtStation(host, s0, lo),
    pointAtStation(host, s1, lo),
    pointAtStation(host, s1, hi),
    pointAtStation(host, s0, hi),
  ].map(to);
  const refs = quad.map(([x, y]) => point2(c.w, x, y));
  const loop = c.w.add('IfcPolyline', [[...refs, refs[0] as Raw]]);
  const profile = c.w.add('IfcArbitraryClosedProfileDef', [en('AREA'), null, loop]);
  const at = c.w.add('IfcAxis2Placement3D', [c.w.add('IfcCartesianPoint', [[0, 0, o.sill]]), null, null]);
  const up = c.w.add('IfcDirection', [[0, 0, 1]]);
  const solid = c.w.add('IfcExtrudedAreaSolid', [profile, at, up, o.height]);
  const rep = c.w.add('IfcShapeRepresentation', [c.body, str('Body'), str('SweptSolid'), [solid]]);
  return c.w.add('IfcProductDefinitionShape', [null, null, [rep]]);
}

/** Zapíše otvory stěny a jejich vztah ke stěně (IfcRelVoidsElement). */
export function writeOpenings(
  c: IfcContext,
  m: Model,
  w: Wall,
  wall: Raw,
  wallPlacement: Raw,
  to: (p: Vec2) => [number, number],
): void {
  for (const o of openingsOf(m, w.id)) {
    const niche = o.kind === 'niche';
    const entity = c.w.add('IfcOpeningElement', [
      str(modelGlobalId(o.id)),
      null,
      str(niche ? 'Nika' : 'Otvor'),
      null,
      null,
      placement(c, wallPlacement, { x: 0, y: 0, z: 0 }),
      body(c, m, o, w, to),
      null,
      en(niche ? 'RECESS' : 'OPENING'),
    ]);
    c.w.add('IfcRelVoidsElement', [str(derivedGlobalId(`${o.id}/voids`)), null, null, null, wall, entity]);
  }
}
