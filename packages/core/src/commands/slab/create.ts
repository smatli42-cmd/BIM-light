// Příkaz: nová deska (D1). Obrys = mnohoúhelník (`outline`) nebo obdélník ze dvou rohů (`rect`).
// Horní líc: podlaha na úrovni podlaží (čistá podlaha), nosná deska pod skladbou podlahy.
import type { Vec2 } from '../../geometry/index.ts';
import { IFC_CLASS } from '../../model/categories.ts';
import { STATUSES, type Status } from '../../model/types.ts';
import { putElements } from '../../model/update.ts';
import { DEFAULT_FLOOR_BUILDUP, SLAB_FUNCTIONS, type Slab, type SlabFunction } from '../../slab/types.ts';
import { storeyOf } from '../lookup.ts';
import { S } from '../schema.ts';
import { defineCommand, fail } from '../types.ts';
import { OUTLINE_SCHEMA, RECT_SCHEMA, rectOutline, slabTypeOf, validOutline } from './shared.ts';

export interface SlabCreateParams {
  storeyId: string;
  typeId: string;
  outline?: Vec2[];
  rect?: { a: Vec2; b: Vec2 };
  topOffset?: number;
  slabFunction?: SlabFunction;
  status?: Status;
  discipline?: string;
}

/** IFC třída podle funkce: nosná deska = IfcSlab, skladba podlahy = IfcCovering (FLOORING). */
export const slabIfcClass = (f: SlabFunction): string =>
  f === 'floor' ? IFC_CLASS.covering : IFC_CLASS.slab;

/** Výchozí horní líc: podlaha 0 (= úroveň podlaží), nosná deska −150 (pod skladbou podlahy). */
export const defaultTopOffset = (f: SlabFunction): number => (f === 'floor' ? 0 : -DEFAULT_FLOOR_BUILDUP);

export const slabCreate = defineCommand<SlabCreateParams>({
  name: 'slab.create',
  label: 'Deska',
  description:
    'Vytvoří desku (strop nebo skladbu podlahy) s obrysem outline (body mnohoúhelníku) nebo rect ' +
    '(dva protilehlé rohy). topOffset = horní líc nad úrovní podlaží v mm (výchozí: podlaha 0, nosná ' +
    'deska −150, tj. pod skladbou podlahy); tloušťka jde dolů podle skladby typu. slabFunction výchozí ' +
    'podle typu (structure = nosná deska, floor = skladba podlahy).',
  group: 'Deska',
  icon: 'slab',
  params: S.object(
    {
      storeyId: S.id,
      typeId: S.id,
      outline: OUTLINE_SCHEMA,
      rect: RECT_SCHEMA,
      topOffset: S.number('horní líc nad úrovní podlaží (mm)'),
      slabFunction: S.enumOf(SLAB_FUNCTIONS, 'structure = nosná deska, floor = skladba podlahy'),
      status: S.enumOf(STATUSES, 'stav: stávající / bourání / nový'),
      discipline: { type: 'string' },
    },
    ['storeyId', 'typeId'],
  ),
  run(model, p, ctx) {
    const storey = storeyOf(model, p.storeyId);
    const type = slabTypeOf(model, p.typeId);
    const pts =
      p.outline ??
      (p.rect ? rectOutline(p.rect.a, p.rect.b) : fail('invalid-params', 'Chybí outline nebo rect'));
    const fn = p.slabFunction ?? type.slabFunction;
    const slab: Slab = {
      id: ctx.newId(),
      ifcClass: slabIfcClass(fn),
      category: 'slab',
      discipline: p.discipline ?? 'architecture',
      status: p.status ?? 'new',
      variant: ctx.variant,
      storeyId: storey.id,
      typeId: type.id,
      slabFunction: fn,
      outline: validOutline(pts),
      topOffset: p.topOffset ?? defaultTopOffset(fn),
    };
    return { model: putElements(model, [slab]), created: [slab.id] };
  },
});
