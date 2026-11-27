// Přepis grafiky jednoho prvku (rozhodnutí 4): jen v tomto pohledu (patro 6) nebo všude (patro 5).
import { withHatchOfEffect } from '../../hatch/project.ts';
import type { Id } from '../../ids/index.ts';
import { omitIds, putElements, putRooms, putView } from '../../model/update.ts';
import { EFFECT_SCHEMA } from '../../style/package-schema.ts';
import type { GraphicEffect } from '../../style/types.ts';
import { viewOf, wallOf } from '../lookup.ts';
import { S, type JsonSchema } from '../schema.ts';
import { defineCommand, fail } from '../types.ts';

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
    'Přepíše čáru, barvu, výplň, šrafu nebo průhlednost vybraných prvků (stěny, místnosti – např. barevná ' +
    'výplň místnosti): jen v pohledu (viewId), nebo všude. ' +
    'null přepis zruší. Přepis prvku vždy vyhraje nad stylem i pravidly.',
  group: 'Zobrazení',
  params: S.object({ elementIds: IDS, effect: EFFECT_OR_NULL, viewId: S.id }, ['elementIds', 'effect']),
  run(input, p) {
    const rooms = p.elementIds.flatMap((id) => input.rooms[id] ?? []);
    const walls = p.elementIds.filter((id) => !input.rooms[id]).map((id) => wallOf(input, id));
    const display = withHatchOfEffect(input.display, p.effect);
    if (!display) fail('not-found', 'Šrafa v přepisu neexistuje (viz hatch.list)');
    const model = { ...input, display };
    if (p.viewId) {
      const v = viewOf(model, p.viewId);
      const effect = p.effect;
      const elementOverrides = effect
        ? { ...v.elementOverrides, ...Object.fromEntries(p.elementIds.map((id) => [id, effect])) }
        : omitIds(v.elementOverrides, p.elementIds);
      return { model: putView(model, { ...v, elementOverrides }) };
    }
    const set = <T extends { graphicOverride?: GraphicEffect }>(x: T): T => {
      const { graphicOverride: _old, ...rest } = x;
      return (p.effect ? { ...rest, graphicOverride: p.effect } : rest) as T;
    };
    return { model: putRooms(putElements(model, walls.map(set)), rooms.map(set)) };
  },
});
