// Příkazy úprav střechy: hrana (sklon / štít / přesah), vlastnosti (typ, výška ref. čáry, okap), posun a kopie.
// Roviny se po každé změně přepočítají samy (nic z nich se neukládá).
import { add, type Vec2 } from '../../geometry/index.ts';
import type { Id } from '../../ids/index.ts';
import { STATUSES, type Model, type Status } from '../../model/types.ts';
import { putElements } from '../../model/update.ts';
import { EAVE_CUTS, ROOF_EDGE_KINDS, type EaveCut, type Roof, type RoofEdgeKind } from '../../roof/types.ts';
import { S } from '../schema.ts';
import { defineCommand, fail } from '../types.ts';
import {
  checkEdges,
  checkOverhang,
  checkSlope,
  BREAK_SCHEMA,
  OVERHANG_SCHEMA,
  ROOF_IDS,
  roofOf,
  roofTypeOf,
  SLOPE_SCHEMA,
} from './shared.ts';

export const roofSetEdge = defineCommand<{
  roofId: Id;
  indices: number[];
  kind?: RoofEdgeKind;
  slope?: number;
  overhang?: number;
  breakHeight?: number;
}>({
  name: 'roof.setEdge',
  label: 'Hrana střechy',
  description:
    'Změní hrany obrysu střechy (indices = indexy hran, hrana i = outline[i] → outline[i+1]): kind slope = ' +
    'sklon (okap) / gable = štít / halfhip = polovalba (štít do výšky zlomu breakHeight v mm nad ref. ' +
    'čárou, nad ní valba se sklonem slope), slope = sklon ve stupních, overhang = přesah v mm. Hřebeny, nároží ' +
    'a úžlabí se přepočítají. Aspoň jedna hrana musí zůstat se sklonem.',
  group: 'Střecha',
  params: S.object(
    {
      roofId: S.id,
      indices: { type: 'array', items: { type: 'integer', minimum: 0 }, minItems: 1 },
      kind: S.enumOf(ROOF_EDGE_KINDS, 'slope = sklon (okap), gable = štít'),
      slope: SLOPE_SCHEMA,
      overhang: OVERHANG_SCHEMA,
      breakHeight: BREAK_SCHEMA,
    },
    ['roofId', 'indices'],
  ),
  run(model, p) {
    const r = roofOf(model, p.roofId);
    const bad = p.indices.find((i) => i >= r.edges.length);
    if (bad !== undefined) fail('invalid', `Střecha má jen ${r.edges.length} hran`);
    const edges = r.edges.map((e, i) =>
      p.indices.includes(i)
        ? {
            kind: p.kind ?? e.kind,
            slope: p.slope ?? e.slope,
            overhang: p.overhang ?? e.overhang,
            ...((p.breakHeight ?? e.breakHeight) !== undefined && {
              breakHeight: p.breakHeight ?? e.breakHeight,
            }),
          }
        : e,
    );
    return { model: putElements(model, [{ ...r, edges: checkEdges(edges, r.outline.length) }]) };
  },
});

export interface RoofUpdateParams {
  roofIds: Id[];
  typeId?: Id;
  refOffset?: number;
  eaveLevel?: number;
  eaveCut?: EaveCut;
  slope?: number;
  overhang?: number;
  status?: Status;
}

/** Výška ref. čáry z výšky okapu (první hrany se sklonem): ref = okap + přesah × tg sklonu. */
function refFromEave(model: Model, r: Roof, eave: number): number {
  const e = r.edges.find((x) => x.kind === 'slope');
  const storey = model.storeys[r.storeyId]?.elevation ?? 0;
  const rise = e ? e.overhang * Math.tan((e.slope * Math.PI) / 180) : 0;
  return Math.round(eave + rise - storey);
}

export const roofUpdate = defineCommand<RoofUpdateParams>({
  name: 'roof.update',
  label: 'Vlastnosti střechy',
  description:
    'Změní vlastnosti střech: typeId (typ = skladba), refOffset (výška referenční čáry nad podlahou ' +
    'podlaží, mm), eaveLevel (absolutní výška okapu v mm – dopočítá refOffset z první hrany se sklonem), ' +
    'eaveCut (vertical / perpendicular / horizontal), slope a overhang = sklon a přesah všech hran se sklonem ' +
    '(přesah i štítů), status.',
  group: 'Střecha',
  params: S.object(
    {
      roofIds: ROOF_IDS,
      typeId: S.id,
      refOffset: S.number('výška referenční čáry nad úrovní podlaží (mm)'),
      eaveLevel: S.number('absolutní výška okapu (mm nad ±0,000)'),
      eaveCut: S.enumOf(EAVE_CUTS, 'úhel řezu okapu'),
      slope: SLOPE_SCHEMA,
      overhang: OVERHANG_SCHEMA,
      status: S.enumOf(STATUSES, 'stav'),
    },
    ['roofIds'],
  ),
  run(model, p) {
    if (p.typeId) roofTypeOf(model, p.typeId);
    if (p.slope !== undefined) checkSlope(p.slope);
    if (p.overhang !== undefined) checkOverhang(p.overhang);
    const out = p.roofIds.map((id): Roof => {
      const r = roofOf(model, id);
      const edges = r.edges.map((e) => ({
        ...e,
        ...(p.slope !== undefined && e.kind === 'slope' && { slope: p.slope }),
        ...(p.overhang !== undefined && { overhang: p.overhang }),
      }));
      const next = { ...r, edges };
      const refOffset =
        p.eaveLevel !== undefined ? refFromEave(model, next, p.eaveLevel) : (p.refOffset ?? r.refOffset);
      return {
        ...next,
        refOffset,
        ...(p.typeId && { typeId: p.typeId }),
        ...(p.eaveCut && { eaveCut: p.eaveCut }),
        ...(p.status && { status: p.status }),
      };
    });
    return { model: putElements(model, out) };
  },
});

export const roofMove = defineCommand<{ roofIds: Id[]; vector: Vec2; copy?: boolean }>({
  name: 'roof.move',
  label: 'Posunout střechu',
  description:
    'Posune střechy o vektor v půdorysu (mm). copy = ponechat původní a vytvořit posunuté kopie ' +
    '(vrací id kopií).',
  group: 'Střecha',
  params: S.object({ roofIds: ROOF_IDS, vector: S.point, copy: { type: 'boolean' } }, ['roofIds', 'vector']),
  run(model, p, ctx) {
    const out = p.roofIds.map((id) => {
      const r = roofOf(model, id);
      const moved = { ...r, outline: r.outline.map((q) => add(q, p.vector)) };
      return p.copy ? { ...moved, id: ctx.newId() } : moved;
    });
    return { model: putElements(model, out), created: p.copy ? out.map((r) => r.id) : [] };
  },
});
