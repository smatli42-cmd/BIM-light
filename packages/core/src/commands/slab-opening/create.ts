// Příkaz: otvor v desce (D3; základ 19). Obrys mnohoúhelníkem nebo obdélníkem; hostitelé = zadané desky,
// jinak všechny desky podlaží, které obrys zasáhne (nosná deska i podlaha najednou, prvky stavby 15).
import type { Vec2 } from '../../geometry/index.ts';
import type { Id } from '../../ids/index.ts';
import { STATUSES, type Status } from '../../model/types.ts';
import { putSlabOpenings } from '../../model/update.ts';
import { slabsUnder } from '../../slab-opening/geometry.ts';
import type { SlabOpening } from '../../slab-opening/types.ts';
import { storeyOf } from '../lookup.ts';
import { S } from '../schema.ts';
import { OUTLINE_SCHEMA, RECT_SCHEMA, rectOutline, slabOf, validOutline } from '../slab/shared.ts';
import { defineCommand, fail } from '../types.ts';

export interface SlabOpeningCreateParams {
  storeyId: Id;
  outline?: Vec2[];
  rect?: { a: Vec2; b: Vec2 };
  slabIds?: Id[];
  status?: Status;
}

export const slabOpeningCreate = defineCommand<SlabOpeningCreateParams>({
  name: 'slabOpening.create',
  label: 'Otvor v desce',
  description:
    'Vytvoří svislý otvor v deskách podlaží (prostup, šachta, otvor pro schodiště) s obrysem outline ' +
    '(body v mm) nebo rect (dva rohy). slabIds = desky, které vyřízne; bez nich všechny desky podlaží, ' +
    'které obrys zasáhne (nosný strop i podlahu).',
  group: 'Otvor',
  params: S.object(
    {
      storeyId: S.id,
      outline: OUTLINE_SCHEMA,
      rect: RECT_SCHEMA,
      slabIds: { type: 'array', items: S.id, minItems: 1 },
      status: S.enumOf(STATUSES, 'stav: stávající / bourání / nový'),
    },
    ['storeyId'],
  ),
  run(model, p, ctx) {
    const storey = storeyOf(model, p.storeyId);
    const pts =
      p.outline ??
      (p.rect ? rectOutline(p.rect.a, p.rect.b) : fail('invalid-params', 'Chybí outline nebo rect'));
    const outline = validOutline(pts);
    const hostIds = p.slabIds ?? slabsUnder(model, storey.id, outline).map((s) => s.id);
    hostIds.forEach((id) => slabOf(model, id));
    if (!hostIds.length) fail('invalid', 'Otvor nezasahuje do žádné desky podlaží');
    const o: SlabOpening = {
      id: ctx.newId(),
      ifcClass: 'IfcOpeningElement',
      category: 'opening',
      discipline: 'architecture',
      status: p.status ?? 'new',
      variant: ctx.variant,
      storeyId: storey.id,
      hostIds,
      outline,
    };
    return { model: putSlabOpenings(model, [o]), created: [o.id] };
  },
});
