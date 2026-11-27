// Příkazy grafiky 3D pohledu – stejné jako u půdorysu (základ 26): styl, filtr rekonstrukce, vrstva.
import type { Id } from '../../ids/index.ts';
import { styleOf } from '../lookup.ts';
import { S } from '../schema.ts';
import { defineCommand, fail } from '../types.ts';
import { putView3d, view3dOf } from './view-3d.ts';

export const view3dSetStyle = defineCommand<{ viewId: Id; styleId: Id }>({
  name: 'view3d.setStyle',
  label: 'Styl 3D pohledu',
  description: 'Přepne styl 3D pohledu; místní úpravy (vrstvy) se zruší.',
  group: 'Zobrazení',
  params: S.object({ viewId: S.id, styleId: S.id }, ['viewId', 'styleId']),
  run(model, p) {
    styleOf(model, p.styleId);
    return { model: putView3d(model, { ...view3dOf(model, p.viewId), styleId: p.styleId, local: {} }) };
  },
});

export const view3dSetPhaseFilter = defineCommand<{ viewId: Id; filterId: Id | null }>({
  name: 'view3d.setPhaseFilter',
  label: 'Filtr rekonstrukce ve 3D',
  description:
    'Nastaví 3D pohledu filtr rekonstrukce (id předvolby fáze z view.info, null = vše bez filtru).',
  group: 'Zobrazení',
  params: S.object({ viewId: S.id, filterId: { oneOf: [S.id, { type: 'null' }] } }, ['viewId', 'filterId']),
  run(model, p) {
    if (p.filterId !== null && model.display.overrideCombinations[p.filterId]?.phase !== true)
      fail('not-found', `Předvolba fáze ${p.filterId} neexistuje`);
    return { model: putView3d(model, { ...view3dOf(model, p.viewId), phaseFilterId: p.filterId }) };
  },
});

export const view3dSetLayerState = defineCommand<{ viewId: Id; layerId: Id; visible: boolean }>({
  name: 'view3d.setLayerState',
  label: 'Vrstva ve 3D',
  description: 'Zapne / vypne viditelnost vrstvy ve 3D pohledu (místní úprava stylu).',
  group: 'Zobrazení',
  params: S.object({ viewId: S.id, layerId: S.id, visible: { type: 'boolean' } }, [
    'viewId',
    'layerId',
    'visible',
  ]),
  run(model, p) {
    if (!model.display.layers[p.layerId]) fail('not-found', 'Vrstva neexistuje');
    const v = view3dOf(model, p.viewId);
    const states = { ...v.local.layerStates, [p.layerId]: { visible: p.visible, locked: false } };
    return { model: putView3d(model, { ...v, local: { ...v.local, layerStates: states } }) };
  },
});
