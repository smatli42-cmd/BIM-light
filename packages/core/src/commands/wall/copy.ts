// Příkazy: kopie, zrcadlení, pole (i radiální), otočení s kopií a vložení ze schránky
// (pravidla-interakce: Příkazy nad výběrem). Kopie si nese vzájemná napojení stěn.
import {
  add,
  dot,
  mul,
  norm,
  rotatePath,
  sub,
  translatePath,
  type Path,
  type Vec2,
} from '../../geometry/index.ts';
import type { Id } from '../../ids/index.ts';
import { deleteElements } from '../../rules/delete.ts';
import type { WallSide } from '../../wall/types.ts';
import { wallOf } from '../lookup.ts';
import { PATH_SCHEMA, S, type JsonSchema } from '../schema.ts';
import { defineCommand, fail } from '../types.ts';
import {
  connectionsWithin,
  instantiateWalls,
  specOf,
  type SpecConnection,
  type WallSpec,
} from './instantiate.ts';
import { WALL_IDS } from './shared.ts';

export type WallTransform =
  | { kind: 'translate'; vector: Vec2 }
  | { kind: 'rotate'; center: Vec2; angleDeg: number }
  | { kind: 'mirror'; a: Vec2; b: Vec2 };

const TRANSFORM_SCHEMA: JsonSchema = {
  oneOf: [
    S.object({ kind: S.enumOf(['translate'], 'posun'), vector: S.point }, ['kind', 'vector']),
    S.object({ kind: S.enumOf(['rotate'], 'otočení'), center: S.point, angleDeg: S.number('stupně') }, [
      'kind',
      'center',
      'angleDeg',
    ]),
    S.object({ kind: S.enumOf(['mirror'], 'zrcadlení podle osy a–b'), a: S.point, b: S.point }, [
      'kind',
      'a',
      'b',
    ]),
  ],
};

function mirrorPoint(p: Vec2, a: Vec2, d: Vec2): Vec2 {
  const v = sub(p, a);
  return add(a, sub(mul(d, 2 * dot(v, d)), v));
}

/** Zrcadlení obrátí orientaci: oblouk mění směr a tloušťka přejde na druhou stranu. */
function transformSpec(s: WallSpec, t: WallTransform): WallSpec {
  if (t.kind === 'translate') return { ...s, path: translatePath(s.path, t.vector) };
  if (t.kind === 'rotate') return { ...s, path: rotatePath(s.path, t.center, (t.angleDeg * Math.PI) / 180) };
  const d = norm(sub(t.b, t.a));
  if (d.x === 0 && d.y === 0) fail('invalid', 'Osa zrcadlení má nulovou délku');
  const start = mirrorPoint(s.path.start, t.a, d);
  const end = mirrorPoint(s.path.end, t.a, d);
  const path: Path =
    s.path.kind === 'line' ? { kind: 'line', start, end } : { kind: 'arc', start, end, bulge: -s.path.bulge };
  const side: WallSide = s.side === 'left' ? 'right' : 'left';
  return { ...s, path, side };
}

export interface CopyParams {
  wallIds: Id[];
  transforms: WallTransform[];
  /** Původní stěny smazat (zrcadlení se Shiftem). */
  replace?: boolean;
}

export const wallCopy = defineCommand<CopyParams>({
  name: 'wall.copy',
  label: 'Kopírovat',
  description:
    'Vytvoří kopie vybraných stěn, jednu pro každou transformaci (posun, otočení, zrcadlení). ' +
    'Více transformací = pole. replace = původní stěny smazat. Kopie si nesou vzájemná napojení.',
  group: 'Úpravy',
  icon: 'copy',
  shortcut: 'K',
  params: S.object(
    {
      wallIds: WALL_IDS,
      transforms: { type: 'array', items: TRANSFORM_SCHEMA, minItems: 1 },
      replace: { type: 'boolean' },
    },
    ['wallIds', 'transforms'],
  ),
  run(model, p, ctx) {
    const walls = p.wallIds.map((id) => wallOf(model, id));
    const storeyId = (walls[0] ?? fail('invalid', 'Nic není vybráno')).storeyId;
    const specs = walls.map((w) => specOf(w, model));
    const conns = connectionsWithin(model, p.wallIds);
    let m = p.replace ? deleteElements(model, p.wallIds) : model;
    const created: Id[] = [];
    for (const t of p.transforms) {
      const r = instantiateWalls(
        m,
        storeyId,
        specs.map((s) => transformSpec(s, t)),
        conns,
        ctx,
      );
      m = r.model;
      created.push(...r.ids);
    }
    return { model: m, created };
  },
});

const SPEC_SCHEMA = S.object(
  {
    typeId: S.id,
    path: PATH_SCHEMA,
    side: S.enumOf(['left', 'right'], 'strana'),
    referenceLine: S.enumOf(['face', 'axis', 'core-face'], 'referenční čára'),
    height: { type: 'object' },
    topProfile: { type: 'object' },
    status: { type: 'string' },
    discipline: { type: 'string' },
    openings: { type: 'array', items: { type: 'object' } },
  },
  ['typeId', 'path', 'side', 'referenceLine'],
);

const SIDE_SCHEMA = S.object(
  { index: { type: 'integer' }, at: S.enumOf(['ATSTART', 'ATEND', 'ATPATH'], 'místo') },
  ['index', 'at'],
);

export interface PasteParams {
  storeyId: Id;
  walls: WallSpec[];
  connections?: SpecConnection[];
  vector?: Vec2;
}

export const wallPaste = defineCommand<PasteParams>({
  name: 'wall.paste',
  label: 'Vložit',
  description: 'Vloží stěny ze schránky (popis stěn a jejich napojení), posunuté o vektor.',
  group: 'Úpravy',
  shortcut: 'Ctrl+V',
  params: S.object(
    {
      storeyId: S.id,
      walls: { type: 'array', items: SPEC_SCHEMA, minItems: 1 },
      connections: {
        type: 'array',
        items: S.object({ relating: SIDE_SCHEMA, related: SIDE_SCHEMA }, ['relating', 'related']),
      },
      vector: S.point,
    },
    ['storeyId', 'walls'],
  ),
  run(model, p, ctx) {
    const v = p.vector ?? { x: 0, y: 0 };
    const specs = p.walls.map((s) => transformSpec(s, { kind: 'translate', vector: v }));
    const r = instantiateWalls(model, p.storeyId, specs, p.connections ?? [], ctx);
    return { model: r.model, created: r.ids };
  },
});
