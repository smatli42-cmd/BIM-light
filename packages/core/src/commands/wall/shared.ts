// Společné části příkazů stěny: schémata parametrů a pomocníci.
import { pathLength, type Path, type PathEnd } from '../../geometry/index.ts';
import type { Id } from '../../ids/index.ts';
import type { Model } from '../../model/types.ts';
import { putElements } from '../../model/update.ts';
import { propagateConnections, type WallMotion } from '../../wall/propagate.ts';
import type { Wall } from '../../wall/types.ts';
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
          { kind: S.enumOf(['storey'], 'vázáno na podlaží'), storeyId: S.id, offset: S.number('mm') },
          ['kind', 'storeyId', 'offset'],
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
    const w = next.elements[id];
    if (w && pathLength(w.path) <= 0.1) fail('invalid', 'Změna by zkrátila napojenou stěnu na nulu');
  }
  return next;
}
