// Příkazy: strana tloušťky, typ, stav a profese stěny (výška je v height.ts).
import type { Id } from '../../ids/index.ts';
import { STATUSES, type Status } from '../../model/types.ts';
import { putElements } from '../../model/update.ts';
import type { Wall } from '../../wall/types.ts';
import { wallOf, wallTypeOf } from '../lookup.ts';
import { S } from '../schema.ts';
import { defineCommand } from '../types.ts';
import { WALL_IDS } from './shared.ts';
import { normalizeRefLines } from '../wall-type/shared.ts';

const update = (ids: Id[], model: Parameters<typeof wallOf>[0], fn: (w: Wall) => Wall) =>
  putElements(
    model,
    ids.map((id) => fn(wallOf(model, id))),
  );

export const wallFlipSide = defineCommand<{ wallIds: Id[] }>({
  name: 'wall.flipSide',
  label: 'Přehodit stranu',
  description: 'Přehodí stranu tloušťky (mezerník). Referenční čára zůstane na místě.',
  group: 'Stěna',
  shortcut: 'Space',
  params: S.object({ wallIds: WALL_IDS }, ['wallIds']),
  run: (model, p) => ({
    model: update(p.wallIds, model, (w) => ({ ...w, side: w.side === 'left' ? 'right' : 'left' })),
  }),
});

export const wallSetType = defineCommand<{ wallIds: Id[]; typeId: Id }>({
  name: 'wall.setType',
  label: 'Změnit typ',
  description:
    'Přiřadí stěnám jiný typ. Referenční čára zůstane na místě (u typu bez jádra se „líc jádra“ změní na „líc“).',
  group: 'Stěna',
  params: S.object({ wallIds: WALL_IDS, typeId: S.id }, ['wallIds', 'typeId']),
  run(model, p) {
    wallTypeOf(model, p.typeId);
    return { model: normalizeRefLines(update(p.wallIds, model, (w) => ({ ...w, typeId: p.typeId }))) };
  },
});

export const wallSetProperties = defineCommand<{ wallIds: Id[]; status?: Status; discipline?: string }>({
  name: 'wall.setProperties',
  label: 'Vlastnosti stěny',
  description: 'Změní stav (stávající / bourání / nový) nebo profesi stěn.',
  group: 'Stěna',
  params: S.object(
    { wallIds: WALL_IDS, status: S.enumOf(STATUSES, 'stav'), discipline: { type: 'string' } },
    ['wallIds'],
  ),
  run: (model, p) => ({
    model: update(p.wallIds, model, (w) => ({
      ...w,
      status: p.status ?? w.status,
      discipline: p.discipline ?? w.discipline,
    })),
  }),
});
