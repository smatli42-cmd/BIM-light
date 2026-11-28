// Příkaz: nová střecha (rozhodnutí 11, S1). Obrys referenční čáry = mnohoúhelník (`outline`) nebo obdélník
// (`rect`), hrany z předvolby tvaru (pultová / sedlová / valbová) nebo zadané po jedné (`edges`).
import type { Vec2 } from '../../geometry/index.ts';
import { IFC_CLASS } from '../../model/categories.ts';
import { STATUSES, type Status } from '../../model/types.ts';
import { putElements } from '../../model/update.ts';
import { presetEdges } from '../../roof/presets.ts';
import { signedArea } from '../../slab/geometry.ts';
import {
  DEFAULT_ROOF_OVERHANG,
  DEFAULT_ROOF_REF,
  DEFAULT_ROOF_SLOPE,
  EAVE_CUTS,
  ROOF_SHAPES,
  type EaveCut,
  type Roof,
  type RoofEdge,
  type RoofShape,
} from '../../roof/types.ts';
import { storeyOf } from '../lookup.ts';
import { S } from '../schema.ts';
import { OUTLINE_SCHEMA, RECT_SCHEMA, rectOutline, validOutline } from '../slab/shared.ts';
import { defineCommand, fail } from '../types.ts';
import {
  checkEdges,
  checkOverhang,
  checkSlope,
  EDGE_SCHEMA,
  OVERHANG_SCHEMA,
  roofTypeOf,
  SLOPE_SCHEMA,
} from './shared.ts';

export interface RoofCreateParams {
  storeyId: string;
  typeId: string;
  outline?: Vec2[];
  rect?: { a: Vec2; b: Vec2 };
  shape?: RoofShape;
  slope?: number;
  overhang?: number;
  edges?: RoofEdge[];
  refOffset?: number;
  eaveCut?: EaveCut;
  status?: Status;
}

function edgesFor(outline: readonly Vec2[], p: RoofCreateParams, reversed: boolean): RoofEdge[] {
  // Obrys po směru hodin se obrátí (první bod zůstane): hrany jdou pak v opačném pořadí.
  if (p.edges) return checkEdges(reversed ? [...p.edges].reverse() : p.edges, outline.length);
  const slope = checkSlope(p.slope ?? DEFAULT_ROOF_SLOPE);
  const overhang = checkOverhang(p.overhang ?? DEFAULT_ROOF_OVERHANG);
  const edges = presetEdges(outline, p.shape ?? 'hip', slope, overhang);
  return edges ?? fail('invalid', 'Sedlová předvolba jde jen na čtyřúhelník; jinak zadej hrany (edges)');
}

export const roofCreate = defineCommand<RoofCreateParams>({
  name: 'roof.create',
  label: 'Střecha',
  description:
    'Vytvoří vícerovinnou střechu. Obrys referenční čáry (spodní líc nosné vrstvy = krokví, typicky vnější ' +
    'líc zdi) jako outline (body mnohoúhelníku) nebo rect (dva rohy). Hrany: shape = předvolba (hip = ' +
    'valbová, gable = sedlová se štíty na kratších hranách čtyřúhelníku, shed = pultová s okapem na první ' +
    'hraně) se sklonem slope (°, výchozí 35) a přesahem overhang (mm, výchozí 500), nebo edges = pro ' +
    'každou hranu obrysu (outline[i] → outline[i+1]) kind slope / gable, slope, overhang. refOffset = ' +
    'výška referenční čáry nad úrovní podlaží (mm, výchozí 3000). eaveCut = úhel řezu okapu (vertical / ' +
    'perpendicular / horizontal). Roviny, hřebeny, nároží a úžlabí se spočítají (dotaz roof.planes).',
  group: 'Střecha',
  icon: 'roof',
  params: S.object(
    {
      storeyId: S.id,
      typeId: S.id,
      outline: OUTLINE_SCHEMA,
      rect: RECT_SCHEMA,
      shape: S.enumOf(ROOF_SHAPES, 'předvolba tvaru: shed = pultová, gable = sedlová, hip = valbová'),
      slope: SLOPE_SCHEMA,
      overhang: OVERHANG_SCHEMA,
      edges: { type: 'array', items: EDGE_SCHEMA, minItems: 3 },
      refOffset: S.number('výška referenční čáry nad úrovní podlaží (mm)'),
      eaveCut: S.enumOf(EAVE_CUTS, 'úhel řezu okapu: svisle / kolmo k rovině / vodorovně'),
      status: S.enumOf(STATUSES, 'stav: stávající / bourání / nový'),
    },
    ['storeyId', 'typeId'],
  ),
  run(model, p, ctx) {
    const storey = storeyOf(model, p.storeyId);
    const type = roofTypeOf(model, p.typeId);
    const pts =
      p.outline ??
      (p.rect ? rectOutline(p.rect.a, p.rect.b) : fail('invalid-params', 'Chybí outline nebo rect'));
    const outline = validOutline(pts);
    const reversed = signedArea(pts) < 0;
    const roof: Roof = {
      id: ctx.newId(),
      ifcClass: IFC_CLASS.roof,
      category: 'roof',
      discipline: 'architecture',
      status: p.status ?? 'new',
      variant: ctx.variant,
      storeyId: storey.id,
      typeId: type.id,
      outline,
      edges: edgesFor(outline, p, reversed),
      refOffset: p.refOffset ?? DEFAULT_ROOF_REF,
      eaveCut: p.eaveCut ?? 'vertical',
    };
    return { model: putElements(model, [roof]), created: [roof.id] };
  },
});
