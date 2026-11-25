// Příkazy: kopie (i pole) a zrcadlení otvoru (plán stěn Z4). Kopie najde stěnu pod svým středem.
import { add, dot, mul, norm, sub, type Vec2 } from '../../geometry/index.ts';
import type { Id } from '../../ids/index.ts';
import type { Model } from '../../model/types.ts';
import { stationAt } from '../../opening/along.ts';
import { hostAt } from '../../opening/host-at.ts';
import { rehostOpenings } from '../../opening/rehost.ts';
import { putOpenings } from '../../model/update.ts';
import type { Opening } from '../../opening/types.ts';
import { wallOf } from '../lookup.ts';
import { S } from '../schema.ts';
import { defineCommand, fail } from '../types.ts';
import { movedBy } from './edit.ts';
import { assertOpenings, OPENING_IDS, openingOf } from './shared.ts';

export const openingCopy = defineCommand<{ openingIds: Id[]; vectors: Vec2[] }>({
  name: 'opening.copy',
  label: 'Kopírovat otvor',
  description:
    'Zkopíruje otvory, jednu kopii pro každý vektor posunu (více vektorů = pole). Kopie leží ve stěně ' +
    'pod svým středem (i v jiné stěně stejného podlaží).',
  group: 'Otvor',
  params: S.object({ openingIds: OPENING_IDS, vectors: { type: 'array', items: S.point, minItems: 1 } }, [
    'openingIds',
    'vectors',
  ]),
  run(model, p, ctx) {
    const copies = p.vectors.flatMap((v) =>
      p.openingIds.map((id) => ({ ...movedBy(model, openingOf(model, id), v), id: ctx.newId() })),
    );
    const ids = copies.map((o) => o.id);
    return { model: assertOpenings(putOpenings(model, copies), ids), created: ids };
  },
});

function mirrored(model: Model, o: Opening, a: Vec2, b: Vec2): Opening {
  const d = norm(sub(b, a));
  if (d.x === 0 && d.y === 0) fail('invalid', 'Osa zrcadlení má nulovou délku');
  const c = stationAt(wallOf(model, o.hostId).path, o.offset + o.width / 2).point;
  const v = sub(c, a);
  const target = add(a, sub(mul(d, 2 * dot(v, d)), v));
  const hit = hostAt(model, o.storeyId, target, o.hostId);
  if (!hit) return fail('invalid', 'Zrcadlený otvor musí ležet ve stěně');
  return { ...o, hostId: hit.wall.id, storeyId: hit.wall.storeyId, offset: hit.s - o.width / 2 };
}

export const openingMirror = defineCommand<{ openingIds: Id[]; a: Vec2; b: Vec2; copy?: boolean }>({
  name: 'opening.mirror',
  label: 'Zrcadlit otvor',
  description:
    'Zrcadlí otvory podle osy a–b. copy = ponechat původní (vznikne kopie), jinak se otvor přesune.',
  group: 'Otvor',
  params: S.object({ openingIds: OPENING_IDS, a: S.point, b: S.point, copy: { type: 'boolean' } }, [
    'openingIds',
    'a',
    'b',
  ]),
  run(model, p, ctx) {
    const out = p.openingIds.map((id) => {
      const m = mirrored(model, openingOf(model, id), p.a, p.b);
      return p.copy ? { ...m, id: ctx.newId() } : m;
    });
    const ids = out.map((o) => o.id);
    const m = p.copy ? putOpenings(model, out) : rehostOpenings(model, out);
    return { model: assertOpenings(m, ids), created: p.copy ? ids : [] };
  },
});
