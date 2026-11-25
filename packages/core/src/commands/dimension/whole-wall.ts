// Příkaz: okótovat celou stěnu (pravidla-interakce: „Okótování celé stěny“; plán stěn Z4).
// Vytvoří řetěz líc – hrany otvorů – líc a celkovou délku jako dvě skupiny zarovnaných kót v aktivní
// skupině anotací. Kóty jsou asociativní (odkazují na líce a hrany otvorů) a odemčené.
import type { Id } from '../../ids/index.ts';
import { withLineThrough } from '../../dimension/align.ts';
import { measureDimension } from '../../dimension/measure.ts';
import type { Dimension, FaceRef } from '../../dimension/types.ts';
import { wholeWallRows } from '../../dimension/whole-wall.ts';
import type { Model } from '../../model/types.ts';
import { putDimensions } from '../../model/update.ts';
import type { Vec2 } from '../../geometry/index.ts';
import { wallOf } from '../lookup.ts';
import { S } from '../schema.ts';
import { defineCommand, fail, type CommandContext } from '../types.ts';
import { annotationLayerFor, buildDimension } from './create.ts';

function row(
  model: Model,
  pairs: readonly (readonly [FaceRef, FaceRef])[],
  point: Vec2,
  layer: Id,
  ctx: CommandContext,
): Dimension[] {
  const gid = pairs.length > 1 ? ctx.newId() : null;
  return pairs.map((refs) => {
    const d = buildDimension(model, { kind: 'linear', refs: [refs[0], refs[1]] }, ctx.newId(), layer);
    return { ...withLineThrough(putDimensions(model, [d]), d, point), alignGroupId: gid };
  });
}

export interface WholeWallParams {
  wallId: Id;
  side?: 'ref' | 'opp';
  distance?: number;
  viewId?: Id;
  annotationLayerId?: Id;
}

export const dimensionWholeWall = defineCommand<WholeWallParams>({
  name: 'dimension.wholeWall',
  label: 'Okótovat celou stěnu',
  description:
    'Okótuje stěnu podél líce (side: ref / opp, výchozí opp): řetěz líc – hrany otvorů – líc a pod ním ' +
    'celkovou délku. distance = vzdálenost první řady od líce (mm, výchozí 800). Kóty jdou do aktivní ' +
    'skupiny anotací pohledu.',
  group: 'Kóta',
  params: S.object(
    {
      wallId: S.id,
      side: S.enumOf(['ref', 'opp'], 'líc'),
      distance: S.number('mm', { exclusiveMinimum: 0 }),
      viewId: S.id,
      annotationLayerId: S.id,
    },
    ['wallId'],
  ),
  run(model, p, ctx) {
    wallOf(model, p.wallId);
    const layer = annotationLayerFor(model, p);
    const distance = p.distance ?? 800;
    const rows =
      wholeWallRows(model, p.wallId, p.side ?? 'opp', distance, distance / 2) ??
      fail('invalid', 'Konce stěny nejsou kolmé na stěnu; okótujte je ručně');
    const dims = [
      ...row(model, rows.chain, rows.chainPoint, layer, ctx),
      ...(rows.total ? row(model, [rows.total], rows.totalPoint, layer, ctx) : []),
    ];
    const m = putDimensions(model, dims);
    for (const d of dims) if (!Number.isFinite(measureDimension(m, d))) fail('invalid', 'Kótu nelze změřit');
    return { model: m, created: dims.map((d) => d.id) };
  },
});
