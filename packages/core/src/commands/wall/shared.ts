// Společné části příkazů stěny: schémata parametrů a pomocníci.
import { findWall } from '../../wall/queries.ts';
import { pathLength, type Path, type PathEnd } from '../../geometry/index.ts';
import type { Id } from '../../ids/index.ts';
import { heightError, type HeightBinding } from '../../model/height.ts';
import type { Model } from '../../model/types.ts';
import { putElements } from '../../model/update.ts';
import { propagateConnections, type WallMotion } from '../../wall/propagate.ts';
import type { Wall } from '../../wall/types.ts';
import { detachedTop } from '../../wall-height/attach.ts';
import { S, type JsonSchema } from '../schema.ts';
import { fail } from '../types.ts';

export const END_SCHEMA = S.enumOf(['start', 'end'], 'konec stěny');
export const WALL_IDS = { type: 'array', items: S.id, minItems: 1 } as JsonSchema;

export const HEIGHT_SCHEMA: JsonSchema = S.object(
  {
    baseStoreyId: S.id,
    baseOffset: S.number('odsazení spodku od podlaží (mm)'),
    top: {
      oneOf: [
        S.object(
          { kind: S.enumOf(['height'], 'pevná výška'), value: S.number('mm', { exclusiveMinimum: 0 }) },
          ['kind', 'value'],
        ),
        S.object(
          {
            kind: S.enumOf(['storey'], 'vázáno na podlaží + N'),
            storeys: {
              type: 'integer',
              minimum: 0,
              description: 'N = počet podlaží nad spodním (0 = stejné, 1 = podlaží nad…)',
            },
            offset: S.number('odsazení vršku od úrovně podlaží + N (mm)'),
          },
          ['kind', 'storeys', 'offset'],
        ),
        S.object(
          {
            kind: S.enumOf(['slab'], 'vršek k desce (spodní líc desky, desky D4)'),
            slabId: S.id,
            offset: S.number('odsazení vršku od spodního líce desky (mm, záporné = pod deskou)'),
          },
          ['kind', 'slabId', 'offset'],
        ),
      ],
    },
  },
  ['baseStoreyId', 'baseOffset', 'top'],
);

export const CONNECTION_SCHEMA: JsonSchema = S.object(
  {
    end: END_SCHEMA,
    wallId: S.id,
    at: S.enumOf(['ATSTART', 'ATEND', 'ATPATH'], 'místo na druhé stěně'),
  },
  ['end', 'wallId', 'at'],
);

export function assertPath(path: Path) {
  if (!(pathLength(path) > 0.1)) fail('invalid', 'Stěna musí mít nenulovou délku');
}

export const both = (m: 'none' | 'free' | 'pinned'): WallMotion => ({ start: m, end: m });
export const oneEnd = (end: PathEnd, m: 'free' | 'pinned'): WallMotion =>
  end === 'start' ? { start: m, end: 'none' } : { start: 'none', end: m };

/** Uloží změněné stěny a natáhne napojené (základy 24, 25). */
export function applyWallChanges(
  model: Model,
  changed: readonly Wall[],
  motion: ReadonlyMap<Id, WallMotion>,
): Model {
  for (const w of changed) assertPath(w.path);
  const next = propagateConnections(putElements(model, changed), motion);
  for (const id of Object.keys(next.elements)) {
    const w = findWall(next, id);
    if (w && pathLength(w.path) <= 0.1) fail('invalid', 'Změna by zkrátila napojenou stěnu na nulu');
  }
  return next;
}

/**
 * Výška vložené stěny: vazba se přenese na cílové podlaží (odsazení i N zůstanou, jako Archicad).
 * Vršek k desce se na jiném podlaží změní na podlaží + 1 se stejnou výškou (deska tam není).
 */
export function placedHeight(model: Model, storeyId: Id, h?: HeightBinding): HeightBinding {
  const moved = h && h.top.kind === 'slab' && h.baseStoreyId !== storeyId;
  const own = moved && model.storeys[h.baseStoreyId] ? { ...h, top: detachedTop(model, h) } : h;
  const out: HeightBinding = own
    ? { ...own, baseStoreyId: storeyId }
    : { baseStoreyId: storeyId, baseOffset: 0, top: { kind: 'storey', storeys: 1, offset: 0 } };
  const err = heightError(model, out);
  if (err) fail('invalid', err);
  return out;
}
