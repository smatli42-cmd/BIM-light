// Příkaz: nová trvalá kóta (katalog kreslení 4; pravidla-interakce: kóty 1, 11, 13).
// Nová kóta je odemčená, jde do aktivní skupiny anotací a duplicita se nikdy neodmítá.
import { cross, tangentAt } from '../../geometry/index.ts';
import type { Id } from '../../ids/index.ts';
import type { Model } from '../../model/types.ts';
import { putDimensions } from '../../model/update.ts';
import { facePath, isArcPath, measureDimension } from '../../dimension/measure.ts';
import { measuredFace } from '../../dimension/arc-dim.ts';
import type { ArcMeasure, Dimension, FaceRef, LengthMeasure } from '../../dimension/types.ts';
import { rulesFor } from '../../rules/cross-rules.ts';
import { isCap } from '../../wall/edges.ts';
import { activeAnnotationLayer } from '../../view/effective.ts';
import { viewOf, wallOf } from '../lookup.ts';
import { S, type JsonSchema } from '../schema.ts';
import { defineCommand, fail } from '../types.ts';

export const FACE_REF_SCHEMA: JsonSchema = S.object(
  {
    wallId: S.id,
    face: S.enumOf(['ref', 'opp', 'axis', 'start', 'end'], 'líc stěny nebo čelo konce'),
    openingId: { type: 'string', description: 'GlobalId otvoru: hrana otvoru (face start / end)' },
  },
  ['wallId', 'face'],
);

/** Kóta po oblouku: měřený líc obloukové stěny (plán stěn Z5). */
export const ARC_SCHEMA: JsonSchema = {
  ...S.object({ wallId: S.id, face: S.enumOf(['ref', 'opp'], 'měřený líc') }, ['wallId', 'face']),
  description: 'kóta po oblouku: délka oblouku na líci obloukové stěny',
};

export type DimensionCreateParams = { annotationLayerId?: Id; viewId?: Id } & (
  | { kind: 'linear'; refs: [FaceRef, FaceRef]; ownerRef?: 0 | 1; offset?: number; arc?: ArcMeasure }
  | { kind: 'length'; ref: FaceRef; offset?: number; measure?: LengthMeasure }
  | { kind: 'angular'; wallIds: [Id, Id]; ownerRef?: 0 | 1; radius?: number }
);

const common = { annotationLayerId: S.id, viewId: S.id, offset: S.number('poloha kótovací čáry (mm)') };
const owner = { type: 'integer', enum: [0, 1] } as JsonSchema;

function checkFace(model: Model, ref: FaceRef, capAllowed = true) {
  wallOf(model, ref.wallId);
  if (ref.openingId) {
    const o = model.openings[ref.openingId];
    if (!o || o.hostId !== ref.wallId) fail('invalid', 'Otvor v této stěně neexistuje');
    if (!capAllowed || !rulesFor('opening').dimensionFaces.includes(ref.face))
      fail('invalid', `Na hranu otvoru ${ref.face} nejde kótovat`);
    return;
  }
  if (!rulesFor('wall').dimensionFaces.includes(ref.face) || (!capAllowed && isCap(ref.face)))
    fail('invalid', `Na líc ${ref.face} nejde kótovat`);
}

export function annotationLayerFor(model: Model, p: { annotationLayerId?: Id; viewId?: Id }): Id {
  if (p.annotationLayerId) {
    const layer = model.display.layers[p.annotationLayerId];
    if (!layer || layer.kind !== 'annotation') fail('invalid', 'Skupina anotací neexistuje');
    return layer.id;
  }
  if (p.viewId) return activeAnnotationLayer(model, viewOf(model, p.viewId));
  return fail('invalid-params', 'Chybí skupina anotací (annotationLayerId nebo viewId)');
}

export function buildDimension(model: Model, p: DimensionCreateParams, id: Id, layerId: Id): Dimension {
  const base = {
    id,
    annotationLayerId: layerId,
    locked: false,
    value: 0,
    textOverride: null,
    alignGroupId: null,
  };
  if (p.kind === 'linear') {
    p.refs.forEach((r) => checkFace(model, r));
    const [a, b] = p.refs.map((r) => facePath(model, r));
    if (p.arc && !measuredFace(model, p.arc)) fail('invalid', 'Kóta po oblouku potřebuje obloukovou stěnu');
    if (!p.arc && a && b && Math.abs(cross(tangentAt(a, 'start'), tangentAt(b, 'start'))) > 0.01) {
      fail('invalid', 'Kótovat vzdálenost jde jen mezi rovnoběžnými líci');
    }
    const storeyId = wallOf(model, p.refs[0].wallId).storeyId;
    return {
      ...base,
      storeyId,
      kind: 'linear',
      refs: p.refs,
      ownerRef: p.ownerRef ?? 0,
      offset: p.offset ?? 0,
      ...(p.arc ? { arc: p.arc } : {}),
    };
  }
  if (p.kind === 'length') {
    checkFace(model, p.ref, false);
    const storeyId = wallOf(model, p.ref.wallId).storeyId;
    const measure = p.measure && p.measure !== 'arc' ? { measure: p.measure } : {};
    if (p.measure && p.measure !== 'arc' && !isArcPath(facePath(model, p.ref)))
      fail('invalid', 'Tětivu a poloměr jde kótovat jen u obloukové stěny');
    return { ...base, storeyId, kind: 'length', ref: p.ref, offset: p.offset ?? 500, ...measure };
  }
  const storeyId = wallOf(model, p.wallIds[0]).storeyId;
  wallOf(model, p.wallIds[1]);
  return {
    ...base,
    storeyId,
    kind: 'angular',
    wallIds: p.wallIds,
    ownerRef: p.ownerRef ?? 0,
    radius: p.radius ?? 800,
  };
}

export const dimensionCreate = defineCommand<DimensionCreateParams>({
  name: 'dimension.create',
  label: 'Kóta',
  description:
    'Vytvoří trvalou kótu: vzdálenost dvou rovnoběžných líců, délku líce stěny (u oblouku i tětivu ' +
    'nebo poloměr), nebo úhel dvou stěn. ' +
    'Kóta je odemčená a patří do aktivní skupiny anotací pohledu.',
  group: 'Kóta',
  icon: 'dimension',
  shortcut: 'D',
  params: {
    oneOf: [
      S.object(
        {
          kind: S.enumOf(['linear'], ''),
          refs: { type: 'array', items: FACE_REF_SCHEMA, minItems: 2, maxItems: 2 },
          ownerRef: owner,
          arc: ARC_SCHEMA,
          ...common,
        },
        ['kind', 'refs'],
      ),
      S.object(
        {
          kind: S.enumOf(['length'], ''),
          ref: FACE_REF_SCHEMA,
          measure: S.enumOf(['arc', 'chord', 'radius'], 'délka líce / oblouku, tětiva, nebo poloměr'),
          ...common,
        },
        ['kind', 'ref'],
      ),
      S.object(
        {
          kind: S.enumOf(['angular'], ''),
          wallIds: { type: 'array', items: S.id, minItems: 2, maxItems: 2 },
          ownerRef: owner,
          radius: S.number('mm'),
          annotationLayerId: S.id,
          viewId: S.id,
        },
        ['kind', 'wallIds'],
      ),
    ],
  },
  run(model, p, ctx) {
    const d = buildDimension(model, p, ctx.newId(), annotationLayerFor(model, p));
    if (!Number.isFinite(measureDimension(putDimensions(model, [d]), d)))
      fail('invalid', 'Kótu nelze změřit');
    return { model: putDimensions(model, [d]), created: [d.id] };
  },
});
