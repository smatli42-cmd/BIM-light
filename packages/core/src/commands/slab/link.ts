// Příkazy vazby obrysu desky (základy 14, 16, 24): navázat podlahu na místnost, desku na stěny, zrušit
// vazbu (ruční obrys) a obnovit zamčenou vazbu (obrys se znovu spočítá z modelu).
import type { Id } from '../../ids/index.ts';
import type { Model } from '../../model/types.ts';
import { putElements } from '../../model/update.ts';
import { pruneOutlineDimensions } from '../../dimension/outline-ref.ts';
import { WALL_BOUNDARIES, type WallBoundary } from '../../slab/from-walls.ts';
import type { Slab, SlabLink } from '../../slab/types.ts';
import { S } from '../schema.ts';
import { defineCommand, fail, type CommandResult } from '../types.ts';
import { checkWalls, linkShapeOrFail } from './create.ts';
import { slabOf } from './shared.ts';

/** Deska s vazbou a obrysem spočítaným z ní. */
function withLink(model: Model, s: Slab, link: SlabLink): CommandResult {
  const shape = linkShapeOrFail(model, link);
  const { holes: _h, ...rest } = s;
  const next: Slab = {
    ...rest,
    link,
    outline: shape.outline,
    ...(shape.holes.length && { holes: shape.holes }),
  };
  return { model: pruneOutlineDimensions(putElements(model, [next])) };
}

export const slabLinkRoom = defineCommand<{ slabId: Id; roomId: Id }>({
  name: 'slab.linkRoom',
  label: 'Navázat podlahu na místnost',
  description:
    'Naváže podlahu (slabFunction floor) na místnost: obrys = obrys místnosti od líce k líci i s ostrovy, ' +
    'po posunu stěn se přepočítá. Ruční úprava obrysu vazbu zamkne.',
  group: 'Deska',
  params: S.object({ slabId: S.id, roomId: S.id }, ['slabId', 'roomId']),
  run(model, p) {
    const s = slabOf(model, p.slabId);
    const room = model.rooms[p.roomId] ?? fail('not-found', `Místnost ${p.roomId} neexistuje`);
    if (s.slabFunction !== 'floor') fail('invalid', 'Na místnost jde navázat jen podlaha');
    if (room.storeyId !== s.storeyId) fail('invalid', 'Místnost musí být ve stejném podlaží jako deska');
    return withLink(model, s, { kind: 'room', roomId: room.id });
  },
});

export const slabLinkWalls = defineCommand<{ slabId: Id; wallIds: Id[]; boundary?: WallBoundary }>({
  name: 'slab.linkWalls',
  label: 'Navázat desku na stěny',
  description:
    'Naváže obrys desky na stěny uzavřené smyčky (boundary face = vnitřní líc, core = líc nosného jádra); ' +
    'po změně stěn se obrys přepočítá. Smazaná stěna z vazby vypadne (pod 2 stěny vazba zanikne).',
  group: 'Deska',
  params: S.object(
    {
      slabId: S.id,
      wallIds: { type: 'array', items: S.id, minItems: 2 },
      boundary: S.enumOf(WALL_BOUNDARIES, 'face = vnitřní líc, core = líc jádra'),
    },
    ['slabId', 'wallIds'],
  ),
  run(model, p) {
    const s = slabOf(model, p.slabId);
    checkWalls(model, p.wallIds, s.storeyId);
    return withLink(model, s, { kind: 'walls', wallIds: [...p.wallIds], boundary: p.boundary ?? 'face' });
  },
});

export const slabUnlink = defineCommand<{ slabIds: Id[] }>({
  name: 'slab.unlink',
  label: 'Zrušit vazbu desky',
  description: 'Zruší vazbu obrysu desek na místnost / stěny; obrys zůstane, jak je (ruční deska).',
  group: 'Deska',
  params: S.object({ slabIds: { type: 'array', items: S.id, minItems: 1 } }, ['slabIds']),
  run(model, p) {
    const out = p.slabIds.map((id) => {
      const { link: _l, ...rest } = slabOf(model, id);
      return rest;
    });
    return { model: putElements(model, out) };
  },
});

export const slabRestoreLink = defineCommand<{ slabId: Id }>({
  name: 'slab.restoreLink',
  label: 'Obnovit vazbu desky',
  description:
    'Obnoví zamčenou vazbu desky (po ruční úpravě obrysu): obrys se znovu spočítá z místnosti nebo stěn ' +
    'a dál se s nimi přepočítává.',
  group: 'Deska',
  params: S.object({ slabId: S.id }, ['slabId']),
  run(model, p) {
    const s = slabOf(model, p.slabId);
    if (!s.link) return fail('invalid', 'Deska nemá vazbu (je kreslená ručně)');
    const { locked: _l, ...link } = s.link;
    return withLink(model, s, link as SlabLink);
  },
});
