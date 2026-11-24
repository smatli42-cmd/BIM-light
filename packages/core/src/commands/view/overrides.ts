// Přepis grafiky jednoho prvku (rozhodnutí 4): jen v tomto pohledu (patro 6) nebo všude (patro 5).
import type { Id } from '../../ids/index.ts';
import { omitIds, putElements, putView } from '../../model/update.ts';
import { EFFECT_SCHEMA } from '../../style/package-schema.ts';
import type { GraphicEffect } from '../../style/types.ts';
import { viewOf, wallOf } from '../lookup.ts';
import { S, type JsonSchema } from '../schema.ts';
import { defineCommand } from '../types.ts';

const IDS = { type: 'array', items: S.id, minItems: 1 } as JsonSchema;
const EFFECT_OR_NULL: JsonSchema = { oneOf: [EFFECT_SCHEMA, { type: 'null' }] };

export interface OverrideParams {
  elementIds: Id[];
  effect: GraphicEffect | null;
  /** Pohled pro přepis „jen v tomto pohledu“; bez pohledu = všude. */
  viewId?: Id;
}

export const elementSetGraphicOverride = defineCommand<OverrideParams>({
  name: 'element.setGraphicOverride',
  label: 'Přepis zobrazení prvku',
  description:
    'Přepíše čáru, barvu, výplň, šrafu nebo průhlednost vybraných prvků: jen v pohledu (viewId), nebo všude. ' +
    'null přepis zruší. Přepis prvku vždy vyhraje nad stylem i pravidly.',
  group: 'Zobrazení',
  params: S.object({ elementIds: IDS, effect: EFFECT_OR_NULL, viewId: S.id }, ['elementIds', 'effect']),
  run(model, p) {
    const walls = p.elementIds.map((id) => wallOf(model, id));
    if (p.viewId) {
      const v = viewOf(model, p.viewId);
      const effect = p.effect;
      const elementOverrides = effect
        ? { ...v.elementOverrides, ...Object.fromEntries(p.elementIds.map((id) => [id, effect])) }
        : omitIds(v.elementOverrides, p.elementIds);
      return { model: putView(model, { ...v, elementOverrides }) };
    }
    const updated = walls.map((w) => {
      const { graphicOverride: _old, ...rest } = w;
      return p.effect ? { ...rest, graphicOverride: p.effect } : rest;
    });
    return { model: putElements(model, updated) };
  },
});
