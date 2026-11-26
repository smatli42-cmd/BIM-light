// Stěna v IFC: IfcWall s osou (Axis), tělem vytaženým z obrysu po napojení (Body), skladbou
// (IfcMaterialLayerSetUsage), stavem a vlastnostmi (Pset_WallCommon, plán stěn Z7). Tělo je stěna bez otvorů; otvory ji
// vyříznou přes IfcRelVoidsElement (Z4). Osa obloukové stěny je IfcTrimmedCurve na IfcCircle (Z5);
// obrys těla je lomená čára po společné mřížce oblouku (chyba do 0,5 mm).
import {
  arcData,
  leftNormal,
  norm,
  referenceDepth,
  sub,
  tessellate,
  wallGeometry,
  wallHeight,
  type Model,
  type Vec2,
  type Wall,
  wallProperties,
} from '@bim-light/core';
import { placement, point2, type IfcContext } from './context.ts';
import { derivedGlobalId, modelGlobalId } from './guid.ts';
import { exportBand, type TypeRefs } from './materials.ts';
import { writeOpenings } from './opening.ts';
import { predefined, writeOccurrencePset } from './pset.ts';
import { bool, en, str, type Raw } from './step.ts';

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

/** Osa: úsečka jako lomená čára, oblouk jako oříznutá kružnice (smysl podle směru kreslení). */
function axisCurve(c: IfcContext, w: Wall, to: (p: Vec2) => [number, number]): Raw {
  const p = w.path;
  if (p.kind !== 'arc' || Math.abs(p.bulge) < 1e-9) return polyline(c, tessellate(p).map(to), false);
  const a = arcData(p);
  const [cx, cy] = to(a.center);
  const circle = c.w.add('IfcCircle', [
    c.w.add('IfcAxis2Placement2D', [point2(c.w, cx, cy), null]),
    a.radius,
  ]);
  const trim = (q: Vec2) => {
    const [x, y] = to(q);
    return [point2(c.w, x, y)];
  };
  return c.w.add('IfcTrimmedCurve', [circle, trim(p.start), trim(p.end), bool(a.sweep > 0), en('CARTESIAN')]);
}

function shape(c: IfcContext, m: Model, w: Wall, height: number): Raw {
  const { to } = localFrame(w);
  const axis = axisCurve(c, w, to);
  const axisRep = c.w.add('IfcShapeRepresentation', [c.axis, str('Axis'), str('Curve2D'), [axis]]);
  const up = c.w.add('IfcDirection', [[0, 0, 1]]);
  // Rovina řezu pod vším: žádný otvor obrys nepřeruší, otvory řeže IfcOpeningElement.
  const solids = wallGeometry(m, w, Number.NEGATIVE_INFINITY)
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
  const props = wallProperties(m, w);
  const kind = predefined(props);
  const wall = c.w.add('IfcWall', [
    str(modelGlobalId(w.id)),
    null,
    str(name),
    null,
    str(kind.userType ?? name),
    place,
    shape(c, m, w, h.height),
    null,
    en(kind.type),
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
  writeOccurrencePset(c, w.id, wall, name, props, w.status);
  writeOpenings(c, m, w, wall, place, localFrame(w).to);
  return wall;
}
