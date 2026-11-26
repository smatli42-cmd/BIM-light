// Příkazy značek typu stěny (plán stěn Z8): označit stěny, označit vše na podlaží pohledu, posunout
// podél stěny nebo na druhou stranu, smazat. Každý je jeden krok Zpět (základ 6).
import type { Id } from '../../ids/index.ts';
import type { Model } from '../../model/types.ts';
import { TAG_SIDES, type TagSide, type WallTag } from '../../tag/types.ts';
import { allWalls } from '../../wall/queries.ts';
import { annotationLayerFor } from '../dimension/create.ts';
import { viewOf, wallOf } from '../lookup.ts';
import { S } from '../schema.ts';
import { defineCommand, fail } from '../types.ts';

const GROUP = 'Popisy';
const SIDE = S.enumOf(TAG_SIDES, 'strana: ref u referenčního líce, opp u protilehlého, on na ose');
const POSITION = S.number('poloha podél stěny 0..1 (0,5 = uprostřed)', { minimum: 0, maximum: 1 });

const tagged = (m: Model) => new Set(Object.values(m.wallTags).map((t) => t.wallId));

function addTags(
  model: Model,
  wallIds: readonly Id[],
  p: { annotationLayerId?: Id; viewId?: Id; side?: TagSide; position?: number },
  newId: () => Id,
) {
  const layerId = annotationLayerFor(model, p);
  const has = tagged(model);
  const tags: WallTag[] = wallIds
    .filter((id) => !has.has(id))
    .map((id) => ({
      id: newId(),
      storeyId: wallOf(model, id).storeyId,
      annotationLayerId: layerId,
      wallId: id,
      position: p.position ?? 0.5,
      side: p.side ?? 'ref',
    }));
  const wallTags = { ...model.wallTags, ...Object.fromEntries(tags.map((t) => [t.id, t])) };
  return { model: { ...model, wallTags }, created: tags.map((t) => t.id) };
}

export const wallTagCreate = defineCommand<{
  wallIds: Id[];
  viewId?: Id;
  annotationLayerId?: Id;
  side?: TagSide;
  position?: number;
}>({
  name: 'wallTag.create',
  label: 'Značka typu stěny',
  description:
    'Přidá stěnám značku typu v půdorysu (kroužek se značkou typu, např. S1). Stěna, která už značku má, ' +
    'se přeskočí. Skupina anotací z pohledu (viewId) nebo zadaná; strana a poloha podél stěny volitelné.',
  group: GROUP,
  params: S.object(
    {
      wallIds: { type: 'array', items: S.id, minItems: 1 },
      viewId: S.id,
      annotationLayerId: S.id,
      side: SIDE,
      position: POSITION,
    },
    ['wallIds'],
  ),
  run: (model, p, ctx) => addTags(model, p.wallIds, p, ctx.newId),
});

export const wallTagTagAll = defineCommand<{ viewId: Id; side?: TagSide }>({
  name: 'wallTag.tagAll',
  label: 'Označit všechny stěny',
  description:
    'Přidá značku typu všem stěnám podlaží pohledu, které ji ještě nemají (jako „Tag All“ v Revitu). ' +
    'Skupina anotací = aktivní skupina pohledu.',
  group: GROUP,
  params: S.object({ viewId: S.id, side: SIDE }, ['viewId']),
  run(model, p, ctx) {
    const view = viewOf(model, p.viewId);
    const ids = allWalls(model)
      .filter((w) => w.storeyId === view.storeyId && w.variant.kind === 'main')
      .map((w) => w.id);
    return addTags(model, ids, p, ctx.newId);
  },
});

const tagOf = (m: Model, id: Id) => m.wallTags[id] ?? fail('not-found', `Značka ${id} neexistuje`);

export const wallTagMove = defineCommand<{ tagId: Id; position?: number; side?: TagSide }>({
  name: 'wallTag.move',
  label: 'Posunout značku',
  description: 'Posune značku typu podél stěny (poloha 0..1) nebo ji přesune na jinou stranu stěny.',
  group: GROUP,
  params: S.object({ tagId: S.id, position: POSITION, side: SIDE }, ['tagId']),
  run(model, p) {
    const t = tagOf(model, p.tagId);
    const next = { ...t, position: p.position ?? t.position, side: p.side ?? t.side };
    return { model: { ...model, wallTags: { ...model.wallTags, [t.id]: next } } };
  },
});

export const wallTagDelete = defineCommand<{ tagIds?: Id[]; wallIds?: Id[] }>({
  name: 'wallTag.delete',
  label: 'Smazat značku',
  description: 'Smaže značky typu: zadané id značek, nebo všechny značky zadaných stěn. Stěny se nemění.',
  group: GROUP,
  params: S.object({ tagIds: { type: 'array', items: S.id }, wallIds: { type: 'array', items: S.id } }, []),
  run(model, p) {
    for (const id of p.tagIds ?? []) tagOf(model, id);
    const tags = new Set(p.tagIds ?? []);
    const walls = new Set(p.wallIds ?? []);
    const wallTags = Object.fromEntries(
      Object.entries(model.wallTags).filter(([id, t]) => !tags.has(id) && !walls.has(t.wallId)),
    );
    return { model: { ...model, wallTags } };
  },
});
