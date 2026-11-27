// Příkazy 3D pohledu (požadavek 3D náhledu; Revit 3D pohled se Section Boxem): nový, přejmenovat, smazat,
// rozsah podlaží, ořezový kvádr, styl, filtr rekonstrukce a vrstva. Nic z toho nemění prvky modelu.
import type { Id } from '../../ids/index.ts';
import type { Model } from '../../model/types.ts';
import { omitIds } from '../../model/update.ts';
import { newView3d, type Box3, type View3d } from '../../view-3d/types.ts';
import { storeyOf, styleOf } from '../lookup.ts';
import { S, type JsonSchema } from '../schema.ts';
import { defineCommand, fail } from '../types.ts';

export const POINT3 = S.object({ x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' } }, [
  'x',
  'y',
  'z',
]);
const BOX: JsonSchema = {
  oneOf: [S.object({ min: POINT3, max: POINT3 }, ['min', 'max']), { type: 'null' }],
  description: 'ořezový kvádr v mm (osy modelu, z nad ±0,000); null = vypnout',
};
const STOREYS: JsonSchema = {
  oneOf: [{ type: 'array', items: S.id }, { type: 'null' }],
  description: 'id zobrazených podlaží; null = všechna',
};

export const view3dOf = (m: Model, id: Id): View3d =>
  m.views3d[id] ?? fail('not-found', `3D pohled ${id} neexistuje`);
export const putView3d = (m: Model, v: View3d): Model => ({ ...m, views3d: { ...m.views3d, [v.id]: v } });
const change = (m: Model, id: Id, fn: (v: View3d) => View3d) => ({
  model: putView3d(m, fn(view3dOf(m, id))),
});

function validBox(b: Box3 | null): Box3 | null {
  if (b && (b.max.x <= b.min.x || b.max.y <= b.min.y || b.max.z <= b.min.z))
    fail('invalid', 'Ořezový kvádr musí mít max větší než min ve všech osách');
  return b;
}

export const view3dCreate = defineCommand<{
  name?: string;
  styleId?: Id;
  storeyIds?: Id[] | null;
  sectionBox?: Box3 | null;
}>({
  name: 'view3d.create',
  label: 'Nový 3D pohled',
  description:
    'Vytvoří uložený 3D pohled s názvem. styleId = styl (výchozí styl prvního pohledu), storeyIds = ' +
    'zobrazená podlaží (null = všechna), sectionBox = ořezový kvádr v mm (null = bez ořezu).',
  group: 'Zobrazení',
  params: S.object({ name: { type: 'string' }, styleId: S.id, storeyIds: STOREYS, sectionBox: BOX }, []),
  run(model, p, ctx) {
    const styleId = p.styleId ?? Object.values(model.views)[0]?.styleId ?? '';
    styleOf(model, styleId);
    (p.storeyIds ?? []).forEach((id) => storeyOf(model, id));
    const n = Object.keys(model.views3d).length + 1;
    const v: View3d = {
      ...newView3d(ctx.newId(), p.name ?? `3D ${n}`, styleId),
      storeyIds: p.storeyIds ?? null,
      sectionBox: validBox(p.sectionBox ?? null),
    };
    return { model: putView3d(model, v), created: [v.id] };
  },
});

export const view3dRename = defineCommand<{ viewId: Id; name: string }>({
  name: 'view3d.rename',
  label: 'Přejmenovat 3D pohled',
  description: 'Změní název 3D pohledu (zobrazuje se v seznamu pohledů a v záhlaví 3D okna).',
  group: 'Zobrazení',
  params: S.object({ viewId: S.id, name: { type: 'string' } }, ['viewId', 'name']),
  run(model, p) {
    if (!p.name.trim()) fail('invalid', 'Název nesmí být prázdný');
    return change(model, p.viewId, (v) => ({ ...v, name: p.name.trim() }));
  },
});

export const view3dDelete = defineCommand<{ viewId: Id }>({
  name: 'view3d.delete',
  label: 'Smazat 3D pohled',
  description: 'Smaže 3D pohled (model se nemění). Poslední 3D pohled smazat nejde.',
  group: 'Zobrazení',
  params: S.object({ viewId: S.id }, ['viewId']),
  run(model, p) {
    view3dOf(model, p.viewId);
    if (Object.keys(model.views3d).length < 2) fail('invalid', 'Poslední 3D pohled nejde smazat');
    return { model: { ...model, views3d: omitIds(model.views3d, [p.viewId]) } };
  },
});

export const view3dSetStoreys = defineCommand<{ viewId: Id; storeyIds: Id[] | null }>({
  name: 'view3d.setStoreys',
  label: 'Podlaží ve 3D',
  description: 'Nastaví, která podlaží 3D pohled ukazuje (null = všechna).',
  group: 'Zobrazení',
  params: S.object({ viewId: S.id, storeyIds: STOREYS }, ['viewId', 'storeyIds']),
  run(model, p) {
    (p.storeyIds ?? []).forEach((id) => storeyOf(model, id));
    return change(model, p.viewId, (v) => ({ ...v, storeyIds: p.storeyIds }));
  },
});

export const view3dSetSectionBox = defineCommand<{ viewId: Id; sectionBox: Box3 | null }>({
  name: 'view3d.setSectionBox',
  label: 'Ořezový kvádr',
  description: 'Nastaví 3D pohledu ořezový kvádr (min / max v mm, osy modelu), null = vypnout.',
  group: 'Zobrazení',
  params: S.object({ viewId: S.id, sectionBox: BOX }, ['viewId', 'sectionBox']),
  run: (model, p) => change(model, p.viewId, (v) => ({ ...v, sectionBox: validBox(p.sectionBox) })),
});
