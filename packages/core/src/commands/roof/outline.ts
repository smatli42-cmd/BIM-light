// Příkazy obrysu střechy (S2): posun bodu obrysu ref. čáry (úchop v půdorysu) a nový obrys. Hrany obrysu
// zůstanou (sklon, štít, přesah); obrys po směru hodin se obrátí i s hranami.
import type { Vec2 } from '../../geometry/index.ts';
import type { Id } from '../../ids/index.ts';
import type { Model } from '../../model/types.ts';
import { putElements } from '../../model/update.ts';
import type { Roof, RoofEdge } from '../../roof/types.ts';
import { signedArea } from '../../slab/geometry.ts';
import { S } from '../schema.ts';
import { OUTLINE_SCHEMA, validOutline } from '../slab/shared.ts';
import { defineCommand, fail } from '../types.ts';
import { checkEdges, EDGE_SCHEMA, roofOf } from './shared.ts';

/** Střecha s novým obrysem; hrany se k bodům přiřadí i po obrácení pořadí. */
function withOutline(model: Model, r: Roof, pts: readonly Vec2[], edges: readonly RoofEdge[]): Model {
  const reversed = signedArea(pts) < 0;
  const outline = validOutline(pts);
  const e = reversed ? [...edges].reverse() : edges;
  return putElements(model, [{ ...r, outline, edges: checkEdges(e, outline.length) }]);
}

export const roofMoveVertex = defineCommand<{ roofId: Id; index: number; point: Vec2 }>({
  name: 'roof.moveVertex',
  label: 'Posunout bod střechy',
  description:
    'Posune bod obrysu referenční čáry střechy (index od 0) na nové místo (mm). Hrany si nechají sklon, ' +
    'štít i přesah; roviny, hřebeny a úžlabí se přepočítají.',
  group: 'Střecha',
  params: S.object({ roofId: S.id, index: { type: 'integer', minimum: 0 }, point: S.point }, [
    'roofId',
    'index',
    'point',
  ]),
  run(model, p) {
    const r = roofOf(model, p.roofId);
    if (p.index >= r.outline.length) fail('invalid', `Obrys má jen ${r.outline.length} bodů`);
    const pts = r.outline.map((q, i) => (i === p.index ? p.point : q));
    return { model: withOutline(model, r, pts, r.edges) };
  },
});

export const roofSetOutline = defineCommand<{ roofId: Id; outline: Vec2[]; edges?: RoofEdge[] }>({
  name: 'roof.setOutline',
  label: 'Obrys střechy',
  description:
    'Nahradí obrys referenční čáry střechy (body mnohoúhelníku v mm). edges = hrany (kind, slope, overhang) ' +
    'pro každou hranu nového obrysu; bez nich musí mít obrys stejný počet bodů a hrany zůstanou.',
  group: 'Střecha',
  params: S.object(
    { roofId: S.id, outline: OUTLINE_SCHEMA, edges: { type: 'array', items: EDGE_SCHEMA, minItems: 3 } },
    ['roofId', 'outline'],
  ),
  run(model, p) {
    const r = roofOf(model, p.roofId);
    const edges = p.edges ?? r.edges;
    if (edges.length !== p.outline.length) fail('invalid', `Obrys má ${p.outline.length} hran, zadej edges`);
    return { model: withOutline(model, r, p.outline, edges) };
  },
});
