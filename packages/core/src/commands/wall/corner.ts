// Příkazy: ořez do rohu, zarovnání líce a obdélník stěn (pravidla-interakce: Příkazy, T / L / B).
import {
  carrierOf,
  cross,
  dot,
  intersectNearest,
  leftNormal,
  mid,
  tangentAt,
  withEnd,
  type PathEnd,
  type Vec2,
} from '../../geometry/index.ts';
import { paramOf } from '../../geometry/split.ts';
import type { Id } from '../../ids/index.ts';
import { putElements, putRelations, removeRelations } from '../../model/update.ts';
import { STATUSES, type Status } from '../../model/types.ts';
import { facePath } from '../../dimension/measure.ts';
import type { FaceRef } from '../../dimension/types.ts';
import { connectionsOf, endToType, sidesFor } from '../../wall/queries.ts';
import type { Wall, WallSide } from '../../wall/types.ts';
import { wallOf } from '../lookup.ts';
import { S } from '../schema.ts';
import { defineCommand, fail } from '../types.ts';
import { FACE_REF_SCHEMA } from '../dimension/create.ts';
import { instantiateWalls } from './instantiate.ts';
import { assertPath } from './shared.ts';
import { offsetWall } from './move.ts';

/** Který konec se utne: ten na opačné straně průsečíku než místo kliknutí (část, která zůstane). */
function endToTrim(w: Wall, keep: Vec2, at: Vec2): PathEnd {
  return paramOf(w.path, keep) < paramOf(w.path, at) ? 'end' : 'start';
}

export interface TrimParams {
  wallA: Id;
  keepA: Vec2;
  wallB: Id;
  keepB: Vec2;
}

export const wallTrimToCorner = defineCommand<TrimParams>({
  name: 'wall.trimToCorner',
  label: 'Do rohu',
  description:
    'Prodlouží nebo zkrátí dvě stěny do společného rohu a uloží napojení. keepA / keepB = bod na části ' +
    'stěny, která zůstane.',
  group: 'Úpravy',
  shortcut: 'T',
  params: S.object({ wallA: S.id, keepA: S.point, wallB: S.id, keepB: S.point }, [
    'wallA',
    'keepA',
    'wallB',
    'keepB',
  ]),
  run(model, p, ctx) {
    const a = wallOf(model, p.wallA);
    const b = wallOf(model, p.wallB);
    if (a.id === b.id) fail('invalid', 'Vyber dvě různé stěny');
    const at = intersectNearest(carrierOf(a.path), carrierOf(b.path), mid(p.keepA, p.keepB));
    if (!at) return fail('invalid', 'Stěny jsou rovnoběžné, roh z nich nevznikne');
    const ea = endToTrim(a, p.keepA, at);
    const eb = endToTrim(b, p.keepB, at);
    const na = { ...a, path: withEnd(a.path, ea, at) };
    const nb = { ...b, path: withEnd(b.path, eb, at) };
    assertPath(na.path);
    assertPath(nb.path);
    const atEnd = (id: Id, e: PathEnd) =>
      connectionsOf(model, id).filter((c) => sidesFor(c, id).own.at === endToType(e));
    const old = [...atEnd(a.id, ea), ...atEnd(b.id, eb)];
    const rel = {
      id: ctx.newId(),
      kind: 'wall-connection' as const,
      relating: { wallId: a.id, at: endToType(ea) },
      related: { wallId: b.id, at: endToType(eb) },
    };
    const m = putRelations(
      removeRelations(
        putElements(model, [na, nb]),
        old.map((c) => c.id),
      ),
      [rel],
    );
    return { model: m, created: [rel.id] };
  },
});

export const wallAlign = defineCommand<{ reference: FaceRef; target: FaceRef }>({
  name: 'wall.align',
  label: 'Zarovnat',
  description:
    'Posune stěnu tak, aby její líc ležel v přímce s rovnoběžným referenčním lícem. Tloušťka zůstává.',
  group: 'Úpravy',
  shortcut: 'L',
  params: S.object({ reference: FACE_REF_SCHEMA, target: FACE_REF_SCHEMA }, ['reference', 'target']),
  run(model, p) {
    if (p.reference.wallId === p.target.wallId) fail('invalid', 'Vyber líc jiné stěny, než je referenční');
    const r = facePath(model, p.reference);
    const t = facePath(model, p.target);
    if (
      r.kind !== 'line' ||
      t.kind !== 'line' ||
      Math.abs(cross(tangentAt(r, 'start'), tangentAt(t, 'start'))) > 0.02
    )
      fail('invalid', 'Líce nejsou rovnoběžné, nelze je zarovnat');
    const w = wallOf(model, p.target.wallId);
    const n = leftNormal(tangentAt(w.path, 'start'));
    const d = dot({ x: r.start.x - t.start.x, y: r.start.y - t.start.y }, n);
    return { model: Math.abs(d) < 0.01 ? model : offsetWall(model, w.id, d) };
  },
});

export interface RectangleParams {
  storeyId: Id;
  typeId: Id;
  a: Vec2;
  b: Vec2;
  side?: WallSide;
  /** Stav nových stěn (fáze); výchozí nový. */
  status?: Status;
}

export const wallRectangle = defineCommand<RectangleParams>({
  name: 'wall.rectangle',
  label: 'Obdélník',
  description:
    'Nakreslí čtyři stěny po obvodu obdélníku daného protilehlými rohy (po směru hodin po vnitřním líci, ' +
    'tloušťka jde ven). Rohy jsou napojené.',
  group: 'Stěna',
  shortcut: 'B',
  params: S.object(
    {
      storeyId: S.id,
      typeId: S.id,
      a: S.point,
      b: S.point,
      side: S.enumOf(['left', 'right'], 'strana'),
      status: S.enumOf(STATUSES, 'stav: stávající / bourání / nový'),
    },
    ['storeyId', 'typeId', 'a', 'b'],
  ),
  run(model, p, ctx) {
    const x0 = Math.min(p.a.x, p.b.x);
    const x1 = Math.max(p.a.x, p.b.x);
    const y0 = Math.min(p.a.y, p.b.y);
    const y1 = Math.max(p.a.y, p.b.y);
    if (x1 - x0 < 10 || y1 - y0 < 10) fail('invalid', 'Obdélník je moc malý');
    const pts = [
      { x: x0, y: y1 },
      { x: x1, y: y1 },
      { x: x1, y: y0 },
      { x: x0, y: y0 },
    ];
    const specs = pts.map((s, i) => ({
      typeId: p.typeId,
      path: { kind: 'line' as const, start: s, end: pts[(i + 1) % 4] as Vec2 },
      side: p.side ?? ('left' as const),
      referenceLine: 'face' as const,
      ...(p.status ? { status: p.status } : {}),
    }));
    const conns = [0, 1, 2, 3].map((i) => ({
      relating: { index: i, at: 'ATEND' as const },
      related: { index: (i + 1) % 4, at: 'ATSTART' as const },
    }));
    const r = instantiateWalls(model, p.storeyId, specs, conns, ctx);
    return { model: r.model, created: r.ids };
  },
});
