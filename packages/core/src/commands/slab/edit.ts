// Příkazy: úpravy desky (D1) – vlastnosti, obrys, posun bodu obrysu, posun a kopie.
// Pohne se jen vybraná deska (základ 25); stěny stojí.
import { add, type Vec2 } from '../../geometry/index.ts';
import type { Id } from '../../ids/index.ts';
import { STATUSES, type Status } from '../../model/types.ts';
import { putElements, putSlabOpenings } from '../../model/update.ts';
import { pruneOutlineDimensions } from '../../dimension/outline-ref.ts';
import { shiftOpenings } from '../slab-opening/edit.ts';
import { SLAB_FUNCTIONS, type SlabFunction } from '../../slab/types.ts';
import { S } from '../schema.ts';
import { defineCommand, fail } from '../types.ts';
import { slabIfcClass } from './create.ts';
import { OUTLINE_SCHEMA, SLAB_IDS, slabOf, slabTypeOf, validOutline } from './shared.ts';

export interface SlabUpdateParams {
  slabIds: Id[];
  typeId?: Id;
  topOffset?: number;
  slabFunction?: SlabFunction;
  status?: Status;
}

export const slabUpdate = defineCommand<SlabUpdateParams>({
  name: 'slab.update',
  label: 'Vlastnosti desky',
  description:
    'Změní vybraným deskám typ (skladbu), horní líc nad podlažím (topOffset, mm), funkci ' +
    '(structure = nosná deska, floor = skladba podlahy) nebo stav. Obrys se nemění.',
  group: 'Deska',
  params: S.object(
    {
      slabIds: SLAB_IDS,
      typeId: S.id,
      topOffset: S.number('horní líc nad úrovní podlaží (mm)'),
      slabFunction: S.enumOf(SLAB_FUNCTIONS, 'funkce desky'),
      status: S.enumOf(STATUSES, 'stav'),
    },
    ['slabIds'],
  ),
  run(model, { slabIds, ...p }) {
    if (p.typeId) slabTypeOf(model, p.typeId);
    const out = slabIds.map((id) => {
      const s = { ...slabOf(model, id), ...p };
      return { ...s, ifcClass: slabIfcClass(s.slabFunction) };
    });
    return { model: putElements(model, out) };
  },
});

export const slabSetOutline = defineCommand<{ slabId: Id; outline: Vec2[] }>({
  name: 'slab.setOutline',
  label: 'Obrys desky',
  description: 'Nahradí obrys desky novým mnohoúhelníkem (body v mm). Hrany se nesmí křížit.',
  group: 'Deska',
  params: S.object({ slabId: S.id, outline: OUTLINE_SCHEMA }, ['slabId', 'outline']),
  run(model, p) {
    const s = slabOf(model, p.slabId);
    return {
      model: pruneOutlineDimensions(putElements(model, [{ ...s, outline: validOutline(p.outline) }])),
    };
  },
});

export const slabMoveVertex = defineCommand<{ slabId: Id; index: number; point: Vec2 }>({
  name: 'slab.moveVertex',
  label: 'Posunout bod obrysu',
  description: 'Přesune jeden bod obrysu desky (index od 0) do nového bodu; ostatní body stojí.',
  group: 'Deska',
  params: S.object({ slabId: S.id, index: { type: 'integer', minimum: 0 }, point: S.point }, [
    'slabId',
    'index',
    'point',
  ]),
  run(model, p) {
    const s = slabOf(model, p.slabId);
    if (p.index >= s.outline.length) fail('invalid', `Obrys má jen ${s.outline.length} bodů`);
    const outline = s.outline.map((q, i) => (i === p.index ? p.point : q));
    return { model: pruneOutlineDimensions(putElements(model, [{ ...s, outline: validOutline(outline) }])) };
  },
});

export const slabMove = defineCommand<{ slabIds: Id[]; vector: Vec2; copy?: boolean }>({
  name: 'slab.move',
  label: 'Posunout desku',
  description:
    'Posune desky o vektor v půdorysu (mm), i s otvory, které jsou jen v nich. copy = ponechat původní ' +
    'a vytvořit posunuté kopie (bez otvorů).',
  group: 'Deska',
  params: S.object({ slabIds: SLAB_IDS, vector: S.point, copy: { type: 'boolean' } }, ['slabIds', 'vector']),
  run(model, p, ctx) {
    const out = p.slabIds.map((id) => {
      const s = slabOf(model, id);
      const moved = { ...s, outline: s.outline.map((q) => add(q, p.vector)) };
      return p.copy ? { ...moved, id: ctx.newId() } : moved;
    });
    // Otvor, jehož všechny desky se posouvají, jde s nimi (patří jim); šachta přes jiné desky stojí.
    const ids = new Set(p.slabIds);
    const along = Object.values(model.slabOpenings).filter((o) => o.hostIds.every((h) => ids.has(h)));
    const m = p.copy ? model : putSlabOpenings(model, shiftOpenings(along, p.vector));
    return { model: putElements(m, out), created: p.copy ? out.map((s) => s.id) : [] };
  },
});
