// Stěna v IFC: IfcWall s osou (Axis), tělem vytaženým z obrysu po napojení (Body), skladbou
// (IfcMaterialLayerSetUsage) a stavem (Pset_WallCommon.Status). Otvory a oblouk přesně až Z4 a Z5:
// oblouk se zatím zapíše jako lomená čára.
import {
  leftNormal,
  norm,
  referenceDepth,
  sub,
  tessellate,
  wallGeometry,
  wallHeight,
  type Model,
  type Status,
  type Vec2,
  type Wall,
} from '@bim-light/core';
import { placement, point2, type IfcContext } from './context.ts';
import { derivedGlobalId, modelGlobalId } from './guid.ts';
import { exportBand, type TypeRefs } from './materials.ts';
import { en, str, typed, type Raw } from './step.ts';

const STATUS: Record<Status, string> = { existing: 'EXISTING', demolished: 'DEMOLISH', new: 'NEW' };

/** Převod bodu půdorysu do místních souřadnic stěny (počátek = začátek, osa X = směr stěny). */
function localFrame(w: Wall) {
  const dx = norm(sub(w.path.end, w.path.start));
  const dy = leftNormal(dx);
  const to = (p: Vec2): [number, number] => {
    const v = sub(p, w.path.start);
    return [v.x * dx.x + v.y * dx.y, v.x * dy.x + v.y * dy.y];
  };
  return { dx, to };
}

function polyline(c: IfcContext, pts: readonly [number, number][], closed: boolean): Raw {
  const refs = pts.map(([x, y]) => point2(c.w, x, y));
  const first = refs[0];
  return c.w.add('IfcPolyline', [closed && first ? [...refs, first] : refs]);
}

function shape(c: IfcContext, m: Model, w: Wall, height: number): Raw {
  const { to } = localFrame(w);
  const axis = polyline(c, tessellate(w.path).map(to), false);
  const axisRep = c.w.add('IfcShapeRepresentation', [c.axis, str('Axis'), str('Curve2D'), [axis]]);
  const up = c.w.add('IfcDirection', [[0, 0, 1]]);
  const solids = wallGeometry(m, w)
    .outlines.filter((loop) => loop.length >= 3)
    .map((loop) => {
      const profile = c.w.add('IfcArbitraryClosedProfileDef', [
        en('AREA'),
        null,
        polyline(c, loop.map(to), true),
      ]);
      return c.w.add('IfcExtrudedAreaSolid', [profile, c.origin, up, height]);
    });
  const bodyRep = c.w.add('IfcShapeRepresentation', [c.body, str('Body'), str('SweptSolid'), solids]);
  return c.w.add('IfcProductDefinitionShape', [null, null, [axisRep, bodyRep]]);
}

/** Skladba instance: strana tloušťky = směr vrstev, referenční čára = odsazení začátku vrstev. */
function layerUsage(c: IfcContext, m: Model, w: Wall, t: TypeRefs): Raw {
  const type = m.wallTypes[w.typeId];
  const depth = type ? referenceDepth(exportBand(type), w.referenceLine) : 0;
  const left = w.side === 'left';
  return c.w.add('IfcMaterialLayerSetUsage', [
    t.layerSet,
    en('AXIS2'),
    en(left ? 'POSITIVE' : 'NEGATIVE'),
    left ? -depth : depth,
    null,
  ]);
}

function statusPset(c: IfcContext, wall: Raw, w: Wall) {
  const prop = c.w.add('IfcPropertyEnumeratedValue', [
    str('Status'),
    null,
    [typed('IFCLABEL', str(STATUS[w.status]))],
    null,
  ]);
  const pset = c.w.add('IfcPropertySet', [
    str(derivedGlobalId(`${w.id}/pset`)),
    null,
    str('Pset_WallCommon'),
    null,
    [prop],
  ]);
  c.w.add('IfcRelDefinesByProperties', [
    str(derivedGlobalId(`${w.id}/pset-rel`)),
    null,
    null,
    null,
    [wall],
    pset,
  ]);
}

/** Zapíše jednu stěnu; vrací entitu IfcWall. */
export function writeWall(
  c: IfcContext,
  m: Model,
  w: Wall,
  storey: { placement: Raw; elevation: number },
  t: TypeRefs,
): Raw {
  const h = wallHeight(m, w);
  const { dx } = localFrame(w);
  const place = placement(
    c,
    storey.placement,
    { x: w.path.start.x, y: w.path.start.y, z: h.bottom - storey.elevation },
    dx,
  );
  const name = m.wallTypes[w.typeId]?.name ?? 'Stěna';
  const wall = c.w.add('IfcWall', [
    str(modelGlobalId(w.id)),
    null,
    str(name),
    null,
    str(name),
    place,
    shape(c, m, w, h.height),
    null,
    en('STANDARD'),
  ]);
  const usage = layerUsage(c, m, w, t);
  c.w.add('IfcRelAssociatesMaterial', [
    str(derivedGlobalId(`${w.id}/material`)),
    null,
    null,
    null,
    [wall],
    usage,
  ]);
  statusPset(c, wall, w);
  return wall;
}
