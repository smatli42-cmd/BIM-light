// Příkaz: smazat výběr najednou (pravidla-interakce, kóty 12): vybrané stěny, otvory i kóty jedním krokem.
import type { Id } from '../../ids/index.ts';
import { removeDimensions, removeRooms, removeSlabOpenings } from '../../model/update.ts';
import { roomOf } from '../room/room.ts';
import { slabOpeningOf } from '../slab-opening/edit.ts';
import { deleteElements, deleteOpenings } from '../../rules/delete.ts';
import { openingOf } from '../opening/shared.ts';
import { slabOf } from '../slab/shared.ts';
import { dimensionOf, wallOf } from '../lookup.ts';
import { S, type JsonSchema } from '../schema.ts';
import { defineCommand, fail } from '../types.ts';

const IDS = { type: 'array', items: S.id } as JsonSchema;

export const selectionDelete = defineCommand<{
  wallIds?: Id[];
  dimensionIds?: Id[];
  openingIds?: Id[];
  slabIds?: Id[];
  slabOpeningIds?: Id[];
  roomIds?: Id[];
}>({
  name: 'selection.delete',
  label: 'Smazat vybrané',
  description:
    'Smaže vybrané stěny (i s jejich otvory, kótami a napojeními), desky (i s otvory jen v nich), ' +
    'vybrané otvory ve stěnách (openingIds) a v deskách (slabOpeningIds), místnosti (roomIds) a kóty ' +
    'jedním krokem.',
  group: 'Úpravy',
  shortcut: 'Delete',
  params: S.object(
    { wallIds: IDS, dimensionIds: IDS, openingIds: IDS, slabIds: IDS, slabOpeningIds: IDS, roomIds: IDS },
    [],
  ),
  run(model, p) {
    const walls = p.wallIds ?? [];
    const dims = p.dimensionIds ?? [];
    const ops = p.openingIds ?? [];
    const slabs = p.slabIds ?? [];
    const holes = p.slabOpeningIds ?? [];
    const rooms = p.roomIds ?? [];
    if (!walls.length && !dims.length && !ops.length && !slabs.length && !holes.length && !rooms.length)
      fail('invalid', 'Nic není vybráno');
    holes.forEach((id) => slabOpeningOf(model, id));
    walls.forEach((id) => wallOf(model, id));
    dims.forEach((id) => dimensionOf(model, id));
    ops.forEach((id) => openingOf(model, id));
    slabs.forEach((id) => slabOf(model, id));
    rooms.forEach((id) => roomOf(model, id));
    const m = deleteOpenings(
      removeSlabOpenings(removeDimensions(removeRooms(model, rooms), dims), holes),
      ops.filter((id) => model.openings[id]),
    );
    return { model: deleteElements(m, [...walls, ...slabs]) };
  },
});
