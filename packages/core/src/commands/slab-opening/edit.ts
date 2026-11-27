// Příkazy: úpravy otvoru v desce (D3) – obrys, posun bodu obrysu, posun a kopie. Desky stojí (základ 25).
import { add, type Vec2 } from '../../geometry/index.ts';
import type { Id } from '../../ids/index.ts';
import type { Model } from '../../model/types.ts';
import { putSlabOpenings } from '../../model/update.ts';
import { pruneOutlineDimensions } from '../../dimension/outline-ref.ts';
import type { SlabOpening } from '../../slab-opening/types.ts';
import { S, type JsonSchema } from '../schema.ts';
import { OUTLINE_SCHEMA, validOutline } from '../slab/shared.ts';
import { defineCommand, fail } from '../types.ts';

export const slabOpeningOf = (m: Model, id: Id): SlabOpening =>
  m.slabOpenings[id] ?? fail('not-found', `Otvor v desce ${id} neexistuje`);

const IDS = { type: 'array', items: S.id, minItems: 1 } as JsonSchema;

export const slabOpeningSetOutline = defineCommand<{ openingId: Id; outline: Vec2[] }>({
  name: 'slabOpening.setOutline',
  label: 'Obrys otvoru v desce',
  description: 'Nahradí obrys otvoru v desce novým mnohoúhelníkem (body v mm). Hostitelské desky se nemění.',
  group: 'Otvor',
  params: S.object({ openingId: S.id, outline: OUTLINE_SCHEMA }, ['openingId', 'outline']),
  run(model, p) {
    const o = slabOpeningOf(model, p.openingId);
    return {
      model: pruneOutlineDimensions(putSlabOpenings(model, [{ ...o, outline: validOutline(p.outline) }])),
    };
  },
});

export const slabOpeningMoveVertex = defineCommand<{ openingId: Id; index: number; point: Vec2 }>({
  name: 'slabOpening.moveVertex',
  label: 'Posunout bod otvoru',
  description: 'Přesune jeden bod obrysu otvoru v desce (index od 0); ostatní body stojí.',
  group: 'Otvor',
  params: S.object({ openingId: S.id, index: { type: 'integer', minimum: 0 }, point: S.point }, [
    'openingId',
    'index',
    'point',
  ]),
  run(model, p) {
    const o = slabOpeningOf(model, p.openingId);
    if (p.index >= o.outline.length) fail('invalid', `Obrys má jen ${o.outline.length} bodů`);
    const outline = o.outline.map((q, i) => (i === p.index ? p.point : q));
    return {
      model: pruneOutlineDimensions(putSlabOpenings(model, [{ ...o, outline: validOutline(outline) }])),
    };
  },
});

/** Posunuté otvory (pro posun otvorů i s deskami). */
export const shiftOpenings = (ops: readonly SlabOpening[], v: Vec2): SlabOpening[] =>
  ops.map((o) => ({ ...o, outline: o.outline.map((q) => add(q, v)) }));

export const slabOpeningMove = defineCommand<{ openingIds: Id[]; vector: Vec2; copy?: boolean }>({
  name: 'slabOpening.move',
  label: 'Posunout otvor v desce',
  description: 'Posune otvory v deskách o vektor (mm); copy = ponechat původní a vytvořit kopie.',
  group: 'Otvor',
  params: S.object({ openingIds: IDS, vector: S.point, copy: { type: 'boolean' } }, ['openingIds', 'vector']),
  run(model, p, ctx) {
    const moved = shiftOpenings(
      p.openingIds.map((id) => slabOpeningOf(model, id)),
      p.vector,
    ).map((o) => (p.copy ? { ...o, id: ctx.newId() } : o));
    return { model: putSlabOpenings(model, moved), created: p.copy ? moved.map((o) => o.id) : [] };
  },
});
