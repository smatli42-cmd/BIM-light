// Příkaz: nová stěna (katalog kreslení, část 1). Napojení na jiné stěny vzniká v témže kroku.
import { endPoint, type Path, type PathEnd } from '../../geometry/index.ts';
import { REFERENCE_LINES } from '../../wall/types.ts';
import type { Model } from '../../model/types.ts';
import { connectionAt, crossingWalls, inwardDir } from '../../wall/auto-connect.ts';
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
import { assertPath, CONNECTION_SCHEMA, HEIGHT_SCHEMA, placedHeight } from './shared.ts';
import { FLAT_TOP } from '../../wall-height/top-profile.ts';

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
  /** Napojit konce bez zadaného napojení samočinně (roh / T), jako při kreslení myší. */
  autoConnect?: boolean;
  /** Napojit křížem X stěny, které nová stěna protíná uprostřed (kreslení myší, plán stěn Z2). */
  autoCross?: boolean;
}

/** Kříž X se stěnami, které nová stěna protíná uprostřed (plán stěn Z2). */
export function withCrossings(model: Model, wall: Wall, newId: () => string): Model {
  const rels = crossingWalls(model, wall.storeyId, wall.path, wall.id).map((other): WallConnection => ({
    id: newId(),
    kind: 'wall-connection',
    relating: { wallId: other, at: 'ATPATH' },
    related: { wallId: wall.id, at: 'ATPATH' },
  }));
  return rels.length ? putRelations(model, rels) : model;
}

/** Zadaná napojení + samočinná pro konce, které žádné nemají. */
function withAuto(model: Model, storeyId: string, p: WallCreateParams) {
  const out = [...(p.connections ?? [])];
  if (!p.autoConnect) return out;
  for (const end of ['start', 'end'] as const) {
    if (out.some((c) => c.end === end)) continue;
    const at = endPoint(p.path, end);
    const link = connectionAt(model, storeyId, at, [], inwardDir(p.path, end), p.status ?? 'new');
    if (link) out.push({ end, ...link });
  }
  return out;
}

export const wallCreate = defineCommand<WallCreateParams>({
  name: 'wall.create',
  label: 'Stěna',
  description:
    'Nakreslí stěnu po referenční čáře (výchozí vnitřní líc, tloušťka doleva od směru kreslení). ' +
    'Napojení na jiné stěny (roh nebo T) zadej v connections, nebo autoConnect: true napojí konce ' +
    'ležící na volném konci jiné stěny (roh) nebo na jejím líci / ose (T) samo, jako při kreslení myší. ' +
    'autoCross: true (výchozí jako autoConnect) napojí křížem X stěny, které nová stěna protíná uprostřed.',
  group: 'Stěna',
  icon: 'wall',
  shortcut: 'W',
  params: S.object(
    {
      storeyId: S.id,
      typeId: S.id,
      path: PATH_SCHEMA,
      side: S.enumOf(['left', 'right'], 'strana tloušťky vůči směru kreslení'),
      referenceLine: S.enumOf(
        REFERENCE_LINES,
        'referenční čára (face = líc u první vrstvy, opp-face = protilehlý líc)',
      ),
      height: HEIGHT_SCHEMA,
      status: S.enumOf(STATUSES, 'stav: stávající / bourání / nový'),
      discipline: { type: 'string' },
      connections: { type: 'array', items: CONNECTION_SCHEMA },
      autoConnect: { type: 'boolean', description: 'samočinné napojení konců (výchozí ne)' },
      autoCross: {
        type: 'boolean',
        description: 'kříž se stěnami, které nová protne (výchozí jako autoConnect)',
      },
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
      height: placedHeight(model, storey.id, p.height),
      topProfile: FLAT_TOP,
    };
    const relations: WallConnection[] = withAuto(model, storey.id, p).map((c) => {
      wallOf(model, c.wallId);
      return {
        id: ctx.newId(),
        kind: 'wall-connection',
        relating: { wallId: c.wallId, at: c.at },
        related: { wallId: wall.id, at: endToType(c.end) },
      };
    });
    let m = putRelations(putElements(model, [wall]), relations);
    if (p.autoCross ?? p.autoConnect) m = withCrossings(m, wall, ctx.newId);
    const created = Object.keys(m.relations).filter((id) => !model.relations[id]);
    return { model: m, created: [wall.id, ...created] };
  },
});
