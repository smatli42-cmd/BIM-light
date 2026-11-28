// Společné části příkazů střechy: načtení, kontrola hran a schémata parametrů.
import type { Id } from '../../ids/index.ts';
import type { Model } from '../../model/types.ts';
import {
  MAX_ROOF_SLOPE,
  MIN_ROOF_SLOPE,
  ROOF_EDGE_KINDS,
  type Roof,
  type RoofEdge,
  type RoofType,
} from '../../roof/types.ts';
import { S, type JsonSchema } from '../schema.ts';
import { fail } from '../types.ts';

export const ROOF_IDS = { type: 'array', items: S.id, minItems: 1 } as JsonSchema;
export const SLOPE_SCHEMA = S.number(`sklon ve stupních (${MIN_ROOF_SLOPE}–${MAX_ROOF_SLOPE})`);
export const OVERHANG_SCHEMA = S.number('přesah vodorovně za referenční čáru (mm, 0–3000)');
export const EDGE_SCHEMA: JsonSchema = S.object(
  {
    kind: S.enumOf(ROOF_EDGE_KINDS, 'slope = sklon (okap), gable = štít (svislá rovina)'),
    slope: SLOPE_SCHEMA,
    overhang: OVERHANG_SCHEMA,
  },
  ['kind', 'slope', 'overhang'],
);

export function roofOf(m: Model, id: Id): Roof {
  const el = m.elements[id];
  return el && el.category === 'roof' ? el : fail('not-found', `Střecha ${id} neexistuje`);
}

export const roofTypeOf = (m: Model, id: Id): RoofType =>
  m.roofTypes[id] ?? fail('not-found', `Typ střechy ${id} neexistuje`);

export function checkSlope(slope: number): number {
  if (!(slope >= MIN_ROOF_SLOPE && slope <= MAX_ROOF_SLOPE))
    fail('invalid', `Sklon musí být ${MIN_ROOF_SLOPE}–${MAX_ROOF_SLOPE}°`);
  return slope;
}

export function checkOverhang(o: number): number {
  if (!(o >= 0 && o <= 3000)) fail('invalid', 'Přesah musí být 0–3000 mm');
  return o;
}

/** Hrany musí sedět na obrys a aspoň jedna musí mít sklon (jinak by střecha neměla rovinu). */
export function checkEdges(edges: readonly RoofEdge[], points: number): RoofEdge[] {
  if (edges.length !== points) fail('invalid', `Obrys má ${points} hran, zadáno ${edges.length}`);
  edges.forEach((e) => {
    checkSlope(e.slope);
    checkOverhang(e.overhang);
  });
  if (!edges.some((e) => e.kind === 'slope')) fail('invalid', 'Aspoň jedna hrana musí mít sklon (ne štít)');
  return edges.map((e) => ({ kind: e.kind, slope: e.slope, overhang: e.overhang }));
}
