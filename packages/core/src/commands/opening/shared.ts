// Společné části příkazů otvoru.
import type { Id } from '../../ids/index.ts';
import type { Model } from '../../model/types.ts';
import { openingProblem } from '../../opening/validate.ts';
import type { Opening } from '../../opening/types.ts';
import { S, type JsonSchema } from '../schema.ts';
import { fail } from '../types.ts';

export const OPENING_IDS = { type: 'array', items: S.id, minItems: 1 } as JsonSchema;

export const openingOf = (m: Model, id: Id): Opening =>
  m.openings[id] ?? fail('not-found', `Otvor ${id} neexistuje`);

/** Odmítne model, ve kterém některý z otvorů neleží celý ve stěně (vysvětlí proč). */
export function assertOpenings(model: Model, ids: readonly Id[]): Model {
  for (const id of ids) {
    const o = model.openings[id];
    const problem = o && openingProblem(model, o);
    if (problem) fail('invalid', problem);
  }
  return model;
}
