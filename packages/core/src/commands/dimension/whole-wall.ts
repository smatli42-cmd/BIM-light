// Příkaz: okótovat celou stěnu (pravidla-interakce: „Okótování celé stěny“; plán stěn Z4).
// Vytvoří řetěz líc – hrany otvorů – líc a celkovou délku jako dvě skupiny zarovnaných kót v aktivní
// skupině anotací. Kóty jsou asociativní (odkazují na líce a hrany otvorů) a odemčené.
import type { Id } from '../../ids/index.ts';
import { withLineThrough } from '../../dimension/align.ts';
import { measureDimension } from '../../dimension/measure.ts';
import type { ArcMeasure, Dimension, FaceRef } from '../../dimension/types.ts';
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
  arc?: ArcMeasure,
): Dimension[] {
  const gid = pairs.length > 1 ? ctx.newId() : null;
  return pairs.map((refs) => {
    const params = {
      kind: 'linear' as const,
      refs: [refs[0], refs[1]] as [FaceRef, FaceRef],
      ...(arc ? { arc } : {}),
    };
    const d = buildDimension(model, params, ctx.newId(), layer);
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
    const layer = annotationLayerFor(model, p);
    const distance = p.distance ?? 800;
    const rows =
      wholeWallRows(model, p.wallId, p.side ?? 'opp', distance, distance / 2) ??
      fail('invalid', 'Konce stěny nejsou kolmé na stěnu; okótujte je ručně');
    const w = wallOf(model, p.wallId);
    const arc =
      w.path.kind === 'arc' && Math.abs(w.path.bulge) > 1e-9
        ? { wallId: w.id, face: p.side ?? 'opp' }
        : undefined;
    const dims = [
      ...row(model, rows.chain, rows.chainPoint, layer, ctx, arc),
      ...(rows.total ? row(model, [rows.total], rows.totalPoint, layer, ctx, arc) : []),
    ];
    const m = putDimensions(model, dims);
    for (const d of dims) if (!Number.isFinite(measureDimension(m, d))) fail('invalid', 'Kótu nelze změřit');
    return { model: m, created: dims.map((d) => d.id) };
  },
});
