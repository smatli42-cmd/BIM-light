// Příkaz: řetěz stěn po bodech (katalog kreslení, část 1) – totéž co klikání nástrojem Stěna,
// jedním příkazem (jeden krok Undo). Sousední stěny jsou napojené v rozích, uzavřený řetěz i první
// s poslední; volné konce se napojí na existující stěny samy (roh / T), jako při kreslení myší.
import type { Vec2 } from '../../geometry/index.ts';
import { REFERENCE_LINES } from '../../wall/types.ts';
import type { HeightBinding } from '../../model/height.ts';
import { STATUSES, type Status } from '../../model/types.ts';
import type { ReferenceLine, WallSide } from '../../wall/types.ts';
import { S } from '../schema.ts';
import { defineCommand, fail } from '../types.ts';
import { instantiateWalls, type SpecConnection } from './instantiate.ts';
import { HEIGHT_SCHEMA } from './shared.ts';

export interface WallChainParams {
  storeyId: string;
  typeId: string;
  points: Vec2[];
  closed?: boolean;
  side?: WallSide;
  referenceLine?: ReferenceLine;
  height?: HeightBinding;
  status?: Status;
}

export const wallChain = defineCommand<WallChainParams>({
  name: 'wall.chain',
  label: 'Řetěz stěn',
  description:
    'Nakreslí řetěz stěn po bodech (mm) jako nástroj Stěna: každá dvojice sousedních bodů = stěna, ' +
    'stěny jsou napojené v rozích; closed: true uzavře obrys (poslední bod se napojí na první). ' +
    'Konce ležící na existující stěně se napojí samy (roh na volném konci, T na líci). ' +
    'Tloušťka jde doleva od směru (side), obrys po směru hodin po vnitřním líci = tloušťka ven.',
  group: 'Stěna',
  params: S.object(
    {
      storeyId: S.id,
      typeId: S.id,
      points: { type: 'array', items: S.point, minItems: 2, description: 'body řetězu v mm' },
      closed: { type: 'boolean', description: 'uzavřít obrys' },
      side: S.enumOf(['left', 'right'], 'strana tloušťky vůči směru kreslení'),
      referenceLine: S.enumOf(
        REFERENCE_LINES,
        'referenční čára (face = líc u první vrstvy, opp-face = protilehlý líc)',
      ),
      height: HEIGHT_SCHEMA,
      status: S.enumOf(STATUSES, 'stav: stávající / bourání / nový'),
    },
    ['storeyId', 'typeId', 'points'],
  ),
  run(model, p, ctx) {
    const pts = p.points;
    const closed = p.closed ?? false;
    if (closed && pts.length < 3) fail('invalid', 'Uzavřený obrys potřebuje aspoň 3 body');
    const n = closed ? pts.length : pts.length - 1;
    const specs = Array.from({ length: n }, (_, i) => ({
      typeId: p.typeId,
      path: { kind: 'line' as const, start: pts[i] as Vec2, end: pts[(i + 1) % pts.length] as Vec2 },
      side: p.side ?? ('left' as const),
      referenceLine: p.referenceLine ?? ('face' as const),
      ...(p.height ? { height: p.height } : {}),
      ...(p.status ? { status: p.status } : {}),
    }));
    const conns: SpecConnection[] = [];
    for (let i = 0; i < n - 1 + (closed ? 1 : 0); i++)
      conns.push({ relating: { index: i, at: 'ATEND' }, related: { index: (i + 1) % n, at: 'ATSTART' } });
    const r = instantiateWalls(model, p.storeyId, specs, conns, ctx);
    return { model: r.model, created: r.ids };
  },
});
