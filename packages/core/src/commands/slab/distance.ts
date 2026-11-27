// Příkaz: odstup desky / otvoru v desce od nejbližšího prvku na jedné straně (dočasná kóta, katalog
// kreslení 3.3; Revit klik na číslo dočasné kóty). Hýbe se jen vybraný prvek, druhý stojí (základ 25).
import {
  elementOutlineTempDimensions,
  outlineShift,
  type OutlineSide,
} from '../../dimension/outline-temp.ts';
import type { Id } from '../../ids/index.ts';
import { S } from '../schema.ts';
import { slabOpeningMove } from '../slab-opening/edit.ts';
import { defineCommand, fail } from '../types.ts';
import { slabMove } from './edit.ts';

export const outlineSetDistance = defineCommand<{ elementId: Id; side: OutlineSide; value: number }>({
  name: 'outline.setDistance',
  label: 'Odstup desky / otvoru',
  description:
    'Posune desku nebo otvor v desce tak, aby dočasná kóta na straně side (x- vlevo, x+ vpravo, y- dole, ' +
    'y+ nahoře) k nejbližšímu líci stěny nebo hraně desky měla hodnotu value (mm). Viz dotaz outline.tempDimensions.',
  group: 'Deska',
  params: S.object(
    {
      elementId: S.id,
      side: { type: 'string', enum: ['x-', 'x+', 'y-', 'y+'] },
      value: { type: 'number', exclusiveMinimum: 0 },
    },
    ['elementId', 'side', 'value'],
  ),
  run(model, p, ctx) {
    const t = elementOutlineTempDimensions(model, p.elementId).find((d) => d.side === p.side);
    if (!t) fail('not-found', `Na straně ${p.side} prvku ${p.elementId} není žádný prvek ke kótování`);
    const vector = outlineShift(t, p.value);
    if (model.slabOpenings[p.elementId])
      return slabOpeningMove.run(model, { openingIds: [p.elementId], vector }, ctx);
    return slabMove.run(model, { slabIds: [p.elementId], vector }, ctx);
  },
});
