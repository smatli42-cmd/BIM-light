// Příkazy napojení vrstev (plán stěn Z2): „nespojovat“ na konci stěny (jako Disallow Join) a kříž X
// dvou stěn, které se protínají uprostřed (vztah ATPATH–ATPATH, základ 24).
import { pathIntersections, type PathEnd } from '../../geometry/index.ts';
import type { Id } from '../../ids/index.ts';
import type { Model } from '../../model/types.ts';
import { putRelations } from '../../model/update.ts';
import type { WallConnection } from '../../relation/types.ts';
import { connectionsOf, endToType, sidesFor } from '../../wall/queries.ts';
import { wallOf } from '../lookup.ts';
import { S } from '../schema.ts';
import { defineCommand, fail } from '../types.ts';
import { END_SCHEMA } from './shared.ts';

export const wallSetJoin = defineCommand<{ wallId: Id; end: PathEnd; join: boolean }>({
  name: 'wall.setJoin',
  label: 'Spojovat / nespojovat',
  description:
    'Zapne nebo vypne čištění napojení na konci stěny (join: false = nespojovat, jako Disallow Join): ' +
    'vztah zůstane, ale konec se kreslí jako volný a obrysy se jen překryjí.',
  group: 'Stěna',
  params: S.object({ wallId: S.id, end: END_SCHEMA, join: { type: 'boolean' } }, ['wallId', 'end', 'join']),
  run(model, p) {
    wallOf(model, p.wallId);
    const here = connectionsOf(model, p.wallId).filter(
      (c) => sidesFor(c, p.wallId).own.at === endToType(p.end),
    );
    if (here.length === 0) fail('invalid', 'Konec stěny není napojený');
    const rels = here.map((c): WallConnection => {
      const { noJoin: _old, ...rest } = c;
      return p.join ? rest : { ...rest, noJoin: true };
    });
    return { model: putRelations(model, rels) };
  },
});

/** Existuje už kříž mezi dvěma stěnami? */
const hasCross = (m: Model, a: Id, b: Id) =>
  connectionsOf(m, a).some(
    (c) => c.relating.at === 'ATPATH' && c.related.at === 'ATPATH' && sidesFor(c, a).other.wallId === b,
  );

export const wallCross = defineCommand<{ wallId: Id; toWallId: Id }>({
  name: 'wall.cross',
  label: 'Napojit křížem',
  description:
    'Uloží kříž X dvou stěn, které se protínají uprostřed: vrstvy se vyčistí podle priority materiálů ' +
    '(při shodě vyhraje stěna toWallId).',
  group: 'Stěna',
  params: S.object({ wallId: S.id, toWallId: S.id }, ['wallId', 'toWallId']),
  run(model, p, ctx) {
    const a = wallOf(model, p.wallId);
    const b = wallOf(model, p.toWallId);
    if (a.id === b.id) fail('invalid', 'Stěnu nelze napojit samu na sebe');
    if (pathIntersections(a.path, b.path).length === 0) fail('invalid', 'Stěny se neprotínají');
    if (hasCross(model, a.id, b.id)) fail('invalid', 'Kříž už existuje');
    const rel: WallConnection = {
      id: ctx.newId(),
      kind: 'wall-connection',
      relating: { wallId: b.id, at: 'ATPATH' },
      related: { wallId: a.id, at: 'ATPATH' },
    };
    return { model: putRelations(model, [rel]), created: [rel.id] };
  },
});
