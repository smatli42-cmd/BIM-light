// Společné části příkazů desky: načtení, kontrola obrysu a schémata parametrů.
import type { Vec2 } from '../../geometry/index.ts';
import type { Id } from '../../ids/index.ts';
import type { Model } from '../../model/types.ts';
import { normalizeOutline, outlineError } from '../../slab/geometry.ts';
import type { Slab, SlabType } from '../../slab/types.ts';
import { S, type JsonSchema } from '../schema.ts';
import { fail } from '../types.ts';

export const SLAB_IDS = { type: 'array', items: S.id, minItems: 1 } as JsonSchema;
export const OUTLINE_SCHEMA: JsonSchema = {
  type: 'array',
  items: S.point,
  minItems: 3,
  description: 'obrys desky: body mnohoúhelníku v mm (pořadí libovolné, uzavře se samo)',
};
export const RECT_SCHEMA: JsonSchema = S.object({ a: S.point, b: S.point }, ['a', 'b']);

export function slabOf(m: Model, id: Id): Slab {
  const el = m.elements[id];
  return el && el.category === 'slab' ? el : fail('not-found', `Deska ${id} neexistuje`);
}

export const slabTypeOf = (m: Model, id: Id): SlabType =>
  m.slabTypes[id] ?? fail('not-found', `Typ desky ${id} neexistuje`);

/** Platný obrys (proti směru hodin) – jinak odmítnutí příkazu s důvodem. */
export function validOutline(pts: readonly Vec2[]): Vec2[] {
  const out = normalizeOutline(pts);
  const err = outlineError(out);
  return err ? fail('invalid', err) : out;
}

/** Obdélník ze dvou protilehlých rohů. */
export function rectOutline(a: Vec2, b: Vec2): Vec2[] {
  return [a, { x: b.x, y: a.y }, b, { x: a.x, y: b.y }];
}
