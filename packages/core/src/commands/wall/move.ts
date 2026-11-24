// Příkazy: posun, otočení a kolmé odsazení stěn (základ 25, katalog kreslení část 7).
// Pohnou se jen vybrané stěny; napojené se natáhnou, nic dalšího se nehýbe.
import { offsetPath, rotatePath, translatePath, type Path, type Vec2 } from '../../geometry/index.ts';
import type { Id } from '../../ids/index.ts';
import type { Model } from '../../model/types.ts';
import type { WallMotion } from '../../wall/propagate.ts';
import { wallOf } from '../lookup.ts';
import { S } from '../schema.ts';
import { defineCommand } from '../types.ts';
import { applyWallChanges, both, WALL_IDS } from './shared.ts';

/** Změní tvar vybraných stěn (oba konce volné) a natáhne napojené. */
export function transformWalls(model: Model, ids: readonly Id[], fn: (p: Path) => Path): Model {
  const walls = ids.map((id) => wallOf(model, id));
  const moved = walls.map((w) => ({ ...w, path: fn(w.path) }));
  const motion = new Map<Id, WallMotion>(walls.map((w) => [w.id, both('free')]));
  return applyWallChanges(model, moved, motion);
}

export const offsetWall = (model: Model, wallId: Id, distance: number): Model =>
  transformWalls(model, [wallId], (p) => offsetPath(p, distance));

export const wallMove = defineCommand<{ wallIds: Id[]; vector: Vec2 }>({
  name: 'wall.move',
  label: 'Přesunout',
  description: 'Posune vybrané stěny o vektor (mm). Napojené stěny se natáhnou, ostatní stojí.',
  group: 'Úpravy',
  icon: 'move',
  shortcut: 'M',
  params: S.object({ wallIds: WALL_IDS, vector: S.point }, ['wallIds', 'vector']),
  run: (model, p) => ({ model: transformWalls(model, p.wallIds, (path) => translatePath(path, p.vector)) }),
});

export const wallRotate = defineCommand<{ wallIds: Id[]; center: Vec2; angleDeg: number }>({
  name: 'wall.rotate',
  label: 'Otočit',
  description: 'Otočí vybrané stěny kolem bodu o úhel ve stupních (kladný = proti směru hodin).',
  group: 'Úpravy',
  icon: 'rotate',
  shortcut: 'R',
  params: S.object({ wallIds: WALL_IDS, center: S.point, angleDeg: S.number('stupně') }, [
    'wallIds',
    'center',
    'angleDeg',
  ]),
  run: (model, p) => ({
    model: transformWalls(model, p.wallIds, (path) =>
      rotatePath(path, p.center, (p.angleDeg * Math.PI) / 180),
    ),
  }),
});

export const wallOffset = defineCommand<{ wallId: Id; distance: number }>({
  name: 'wall.offset',
  label: 'Odsadit stěnu',
  description:
    'Posune stěnu kolmo o vzdálenost (mm, kladná = doleva od směru kreslení); tloušťka zůstává. ' +
    'Navazující stěny (roh i T) se natáhnou.',
  group: 'Úpravy',
  icon: 'offset',
  params: S.object({ wallId: S.id, distance: S.number('mm') }, ['wallId', 'distance']),
  run: (model, p) => ({ model: offsetWall(model, p.wallId, p.distance) }),
});
