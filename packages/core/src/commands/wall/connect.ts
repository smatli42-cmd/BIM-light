// Příkazy: napojit / odpojit stěny (základ 24) a smazat stěny (průřezová pravidla, základ 7).
import type { PathEnd } from '../../geometry/index.ts';
import type { Id } from '../../ids/index.ts';
import { putRelations, removeRelations } from '../../model/update.ts';
import type { ConnectionType } from '../../relation/types.ts';
import { deleteElements } from '../../rules/delete.ts';
import { connectionsOf, endToType, sidesFor } from '../../wall/queries.ts';
import { wallOf } from '../lookup.ts';
import { S } from '../schema.ts';
import { defineCommand, fail } from '../types.ts';
import { END_SCHEMA, WALL_IDS } from './shared.ts';

export interface ConnectParams {
  wallId: Id;
  end: PathEnd;
  toWallId: Id;
  at: ConnectionType;
}

export const wallConnect = defineCommand<ConnectParams>({
  name: 'wall.connect',
  label: 'Napojit stěnu',
  description: 'Uloží napojení konce stěny na jinou stěnu: na její konec (roh) nebo kamkoli po délce (T).',
  group: 'Stěna',
  params: S.object(
    { wallId: S.id, end: END_SCHEMA, toWallId: S.id, at: S.enumOf(['ATSTART', 'ATEND', 'ATPATH'], 'kam') },
    ['wallId', 'end', 'toWallId', 'at'],
  ),
  run(model, p, ctx) {
    wallOf(model, p.wallId);
    wallOf(model, p.toWallId);
    if (p.wallId === p.toWallId) fail('invalid', 'Stěnu nelze napojit samu na sebe');
    const id = ctx.newId();
    const rel = {
      id,
      kind: 'wall-connection' as const,
      relating: { wallId: p.toWallId, at: p.at },
      related: { wallId: p.wallId, at: endToType(p.end) },
    };
    return { model: putRelations(model, [rel]), created: [id] };
  },
});

export const wallDisconnect = defineCommand<{ wallId: Id; end: PathEnd }>({
  name: 'wall.disconnect',
  label: 'Odpojit roh',
  description: 'Zruší uložená napojení na daném konci stěny. Geometrie se nepohne.',
  group: 'Stěna',
  params: S.object({ wallId: S.id, end: END_SCHEMA }, ['wallId', 'end']),
  run(model, p) {
    wallOf(model, p.wallId);
    const ids = connectionsOf(model, p.wallId)
      .filter((c) => sidesFor(c, p.wallId).own.at === endToType(p.end))
      .map((c) => c.id);
    return { model: removeRelations(model, ids) };
  },
});

export const wallDelete = defineCommand<{ wallIds: Id[] }>({
  name: 'wall.delete',
  label: 'Smazat',
  description: 'Smaže stěny i s jejich kótami a napojeními (podle tabulky průřezových pravidel).',
  group: 'Úpravy',
  shortcut: 'Delete',
  params: S.object({ wallIds: WALL_IDS }, ['wallIds']),
  run(model, p) {
    p.wallIds.forEach((id) => wallOf(model, id));
    return { model: deleteElements(model, p.wallIds) };
  },
});
