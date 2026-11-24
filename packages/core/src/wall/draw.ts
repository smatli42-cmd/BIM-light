// Generátor půdorysu stěny (základy 5, 11; katalog pohledů: „Stěna: smlouva s kreslením“).
// Stěna nevolí barvu, šrafu ani pero sama: vše dostane z funkce grafiky.
// Hrubá: obrys + jedna výplň. Střední (a zatím jemná): čáry vrstev + šrafa materiálu.
import type { Primitive, Stroke } from '../drawing/primitives.ts';
import { tessellate } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import type { Material } from '../material/types.ts';
import type { Detail, ResolvedEffect } from '../style/types.ts';
import type { LayerGeometry, WallGeometry } from './geometry.ts';
import { outlineRuns } from './outline.ts';

type MaterialLookup = (id: Id) => Material | undefined;

function hatchFor(
  layer: LayerGeometry,
  g: ResolvedEffect,
  materials: MaterialLookup,
  wallId: Id,
): Primitive[] {
  if (g.hatch === 'none') return [];
  const h = g.hatch === 'material' ? materials(layer.span.layer.materialId)?.hatch : g.hatch;
  if (!h || h.patternId === 'none') return [];
  const source = { elementId: wallId, role: 'šrafa' };
  return [
    { kind: 'hatch', polygon: layer.polygon, patternId: h.patternId, pen: h.pen, color: h.color, source },
  ];
}

function fill(points: WallGeometry['outline'], g: ResolvedEffect, wallId: Id): Primitive[] {
  if (g.fillColor === null) return [];
  return [
    {
      kind: 'fill',
      polygon: points,
      color: g.fillColor,
      transparency: g.transparency,
      source: { elementId: wallId, role: 'výplň' },
    },
  ];
}

/** Kresba jedné stěny v dané podrobnosti s výslednou grafikou. */
export function drawWall(
  geom: WallGeometry,
  detail: Detail,
  g: ResolvedEffect,
  materials: MaterialLookup,
): Primitive[] {
  if (!g.visible) return [];
  const id = geom.wallId;
  const outline: Stroke = { pen: g.cutPen, color: g.lineColor, lineType: g.lineType };
  const out: Primitive[] = [...fill(geom.outline, g, id)];
  if (detail !== 'coarse') {
    for (const layer of geom.layers) out.push(...hatchFor(layer, g, materials, id));
    const layerStroke: Stroke = { pen: g.layerPen, color: g.lineColor, lineType: g.lineType };
    for (const b of geom.layerBoundaries) {
      out.push({
        kind: 'line',
        points: tessellate(b),
        closed: false,
        stroke: layerStroke,
        source: { elementId: id, role: 'hranice vrstvy' },
      });
    }
  }
  for (const run of outlineRuns(geom)) {
    out.push({ kind: 'line', ...run, stroke: outline, source: { elementId: id, role: 'obrys' } });
  }
  return out;
}
