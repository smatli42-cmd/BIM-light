// Příkazy: usazení kót (pravidla-interakce, kóty 2–4, 7). Nová kóta / řada se nese na myši
// a vznikne až kliknutím; zarovnané kóty tvoří skupinu a hýbou se spolu; Alt kótu ze skupiny vyjme.
import type { Vec2 } from '../../geometry/index.ts';
import type { Id, IdGenerator } from '../../ids/index.ts';
import type { Model } from '../../model/types.ts';
import { putDimensions } from '../../model/update.ts';
import { withLineThrough } from '../../dimension/align.ts';
import { measureDimension } from '../../dimension/measure.ts';
import type { Dimension, FaceRef } from '../../dimension/types.ts';
import { dimensionOf } from '../lookup.ts';
import { S, type JsonSchema } from '../schema.ts';
import { defineCommand, fail } from '../types.ts';
import { annotationLayerFor, buildDimension, FACE_REF_SCHEMA } from './create.ts';

const IDS = { type: 'array', items: S.id, minItems: 1 } as JsonSchema;

/** Zařadí kóty do skupiny kóty `alignWith` (pravidla-interakce, kóty 4). */
function joinGroup(model: Model, ids: readonly Id[], alignWith: Id, newId: IdGenerator): Model {
  const target = dimensionOf(model, alignWith);
  const gid = target.alignGroupId ?? newId();
  const oldGroups = new Set(ids.map((id) => model.dimensions[id]?.alignGroupId).filter(Boolean));
  const members = Object.values(model.dimensions).filter(
    (d) => ids.includes(d.id) || d.id === alignWith || (d.alignGroupId && oldGroups.has(d.alignGroupId)),
  );
  return putDimensions(
    model,
    members.map((d) => ({ ...d, alignGroupId: gid })),
  );
}

export interface PlaceParams {
  dimensionIds: Id[];
  point: Vec2;
  alignWith?: Id;
  detach?: boolean;
}

export const dimensionPlace = defineCommand<PlaceParams>({
  name: 'dimension.place',
  label: 'Posunout kótu',
  description:
    'Posune kótovací čáru kót tak, aby procházela bodem. alignWith = zarovnat s jinou kótou (vznikne ' +
    'skupina zarovnání); detach = kótu ze skupiny vyjmout (Alt).',
  group: 'Kóta',
  params: S.object({ dimensionIds: IDS, point: S.point, alignWith: S.id, detach: { type: 'boolean' } }, [
    'dimensionIds',
    'point',
  ]),
  run(model, p, ctx) {
    const moved = p.dimensionIds.map((id) => {
      const d = withLineThrough(model, dimensionOf(model, id), p.point);
      return p.detach ? { ...d, alignGroupId: null } : d;
    });
    const m = putDimensions(model, moved);
    return { model: p.alignWith ? joinGroup(m, p.dimensionIds, p.alignWith, ctx.newId) : m };
  },
});

type SetItem =
  { kind: 'linear'; refs: [FaceRef, FaceRef]; ownerRef?: 0 | 1 } | { kind: 'length'; ref: FaceRef };

export interface CreateSetParams {
  viewId?: Id;
  annotationLayerId?: Id;
  items: SetItem[];
  point?: Vec2;
  alignWith?: Id;
}

const ITEM_SCHEMA: JsonSchema = {
  oneOf: [
    S.object(
      {
        kind: S.enumOf(['linear'], ''),
        refs: { type: 'array', items: FACE_REF_SCHEMA, minItems: 2, maxItems: 2 },
        ownerRef: { type: 'integer', enum: [0, 1] },
      },
      ['kind', 'refs'],
    ),
    S.object({ kind: S.enumOf(['length'], ''), ref: FACE_REF_SCHEMA }, ['kind', 'ref']),
  ],
};

export const dimensionCreateSet = defineCommand<CreateSetParams>({
  name: 'dimension.createSet',
  label: 'Řada kót',
  description:
    'Vytvoří řadu kót (řetěz jako v Revitu) najednou: všechny leží na čáře přes bod `point` a tvoří ' +
    'skupinu zarovnání; alignWith ji zarovná s dřívější řadou. Kóty jsou odemčené.',
  group: 'Kóta',
  params: S.object(
    {
      viewId: S.id,
      annotationLayerId: S.id,
      items: { type: 'array', items: ITEM_SCHEMA, minItems: 1 },
      point: S.point,
      alignWith: S.id,
    },
    ['items'],
  ),
  run(model, p, ctx) {
    const layer = annotationLayerFor(model, p);
    const gid = p.items.length > 1 ? ctx.newId() : null;
    const dims: Dimension[] = p.items.map((item) => {
      let d = buildDimension(model, item, ctx.newId(), layer);
      if (p.point) d = withLineThrough(putDimensions(model, [d]), d, p.point);
      return { ...d, alignGroupId: gid };
    });
    let m = putDimensions(model, dims);
    for (const d of dims) if (!Number.isFinite(measureDimension(m, d))) fail('invalid', 'Kótu nelze změřit');
    const ids = dims.map((d) => d.id);
    if (p.alignWith) m = joinGroup(m, ids, p.alignWith, ctx.newId);
    return { model: m, created: ids };
  },
});

export const dimensionFlipSide = defineCommand<{ dimensionIds: Id[] }>({
  name: 'dimension.flipSide',
  label: 'Přepnout stranu kóty',
  description: 'Přehodí kótovací čáru (a odkazové čáry) na druhou stranu měřeného místa.',
  group: 'Kóta',
  params: S.object({ dimensionIds: IDS }, ['dimensionIds']),
  run: (model, p) => ({
    model: putDimensions(
      model,
      p.dimensionIds.map((id) => {
        const d = dimensionOf(model, id);
        return d.kind === 'angular' ? d : { ...d, offset: -d.offset, alignGroupId: null };
      }),
    ),
  }),
});
