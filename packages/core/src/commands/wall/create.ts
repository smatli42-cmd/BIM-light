// Příkaz: nová stěna (katalog kreslení, část 1). Napojení na jiné stěny vzniká v témže kroku.
import type { Path, PathEnd } from '../../geometry/index.ts';
import type { HeightBinding } from '../../model/height.ts';
import { IFC_CLASS } from '../../model/categories.ts';
import { STATUSES, type Status } from '../../model/types.ts';
import { putElements, putRelations } from '../../model/update.ts';
import type { ConnectionType, WallConnection } from '../../relation/types.ts';
import { endToType } from '../../wall/queries.ts';
import type { ReferenceLine, Wall, WallSide } from '../../wall/types.ts';
import { storeyOf, wallOf, wallTypeOf } from '../lookup.ts';
import { PATH_SCHEMA, S } from '../schema.ts';
import { defineCommand } from '../types.ts';
import { assertPath, CONNECTION_SCHEMA, HEIGHT_SCHEMA } from './shared.ts';

export interface WallCreateParams {
  storeyId: string;
  typeId: string;
  path: Path;
  side?: WallSide;
  referenceLine?: ReferenceLine;
  height?: HeightBinding;
  status?: Status;
  discipline?: string;
  connections?: { end: PathEnd; wallId: string; at: ConnectionType }[];
}

export const wallCreate = defineCommand<WallCreateParams>({
  name: 'wall.create',
  label: 'Stěna',
  description:
    'Nakreslí stěnu po referenční čáře (výchozí vnitřní líc, tloušťka doleva od směru kreslení). ' +
    'Volitelně ji napojí na jiné stěny (roh nebo T).',
  group: 'Stěna',
  icon: 'wall',
  shortcut: 'W',
  params: S.object(
    {
      storeyId: S.id,
      typeId: S.id,
      path: PATH_SCHEMA,
      side: S.enumOf(['left', 'right'], 'strana tloušťky vůči směru kreslení'),
      referenceLine: S.enumOf(['face', 'axis', 'core-face'], 'referenční čára'),
      height: HEIGHT_SCHEMA,
      status: S.enumOf(STATUSES, 'stav: stávající / bourání / nový'),
      discipline: { type: 'string' },
      connections: { type: 'array', items: CONNECTION_SCHEMA },
    },
    ['storeyId', 'typeId', 'path'],
  ),
  run(model, p, ctx) {
    const storey = storeyOf(model, p.storeyId);
    wallTypeOf(model, p.typeId);
    assertPath(p.path);
    const wall: Wall = {
      id: ctx.newId(),
      ifcClass: IFC_CLASS.wall,
      category: 'wall',
      discipline: p.discipline ?? 'architecture',
      status: p.status ?? 'new',
      variant: ctx.variant,
      storeyId: storey.id,
      typeId: p.typeId,
      path: p.path,
      referenceLine: p.referenceLine ?? 'face',
      side: p.side ?? 'left',
      height: p.height ?? {
        baseStoreyId: storey.id,
        baseOffset: 0,
        top: { kind: 'height', value: storey.height },
      },
    };
    const relations: WallConnection[] = (p.connections ?? []).map((c) => {
      wallOf(model, c.wallId);
      return {
        id: ctx.newId(),
        kind: 'wall-connection',
        relating: { wallId: c.wallId, at: c.at },
        related: { wallId: wall.id, at: endToType(c.end) },
      };
    });
    const m = putRelations(putElements(model, [wall]), relations);
    return { model: m, created: [wall.id, ...relations.map((r) => r.id)] };
  },
});
