// Generátor půdorysu stěny (základy 5, 11; katalog pohledů: „Stěna: smlouva s kreslením“).
// Stěna nevolí barvu, šrafu ani pero sama: vše dostane z funkce grafiky.
// Hrubá: obrys + jedna výplň. Střední (a zatím jemná): čáry vrstev + výplň a šrafa materiálu.
import type { Primitive, Stroke } from '../drawing/primitives.ts';
import type { Id } from '../ids/index.ts';
import type { Detail, ResolvedEffect } from '../style/types.ts';
import { layerHatch, type DrawLookup } from './draw-hatch.ts';
import type { WallGeometry } from './geometry.ts';
import { facePieces, outlineRuns, type FaceGaps } from './outline.ts';

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
  look: DrawLookup,
  gaps: FaceGaps = {},
): Primitive[] {
  if (!g.visible) return [];
  const id = geom.wallId;
  const outline: Stroke = { pen: g.cutPen, color: g.lineColor, lineType: g.lineType };
  const out: Primitive[] = [...fill(geom.outline, g, id)];
  if (detail !== 'coarse') {
    for (const layer of geom.layers) out.push(...layerHatch(layer, g, look, id));
    const layerStroke: Stroke = { pen: g.layerPen, color: g.lineColor, lineType: g.lineType };
    geom.layerBoundaries.forEach((b, i) => {
      for (const points of facePieces(b, gaps.layers?.[i])) {
        out.push({
          kind: 'line',
          points,
          closed: false,
          stroke: layerStroke,
          source: { elementId: id, role: 'hranice vrstvy' },
        });
      }
    });
  }
  for (const run of outlineRuns(geom, gaps)) {
    out.push({ kind: 'line', ...run, stroke: outline, source: { elementId: id, role: 'obrys' } });
  }
  return out;
}
