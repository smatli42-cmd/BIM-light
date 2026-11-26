// Příkazy pohledu (základ 26): nový pohled, přepnutí stylu, měřítko, místní úpravy, Vrátit.
// Nic z toho nemění prvky modelu ani kóty.
import type { Id } from '../../ids/index.ts';
import { DEFAULT_CUT_HEIGHT } from '../../wall/layers.ts';
import type { Model } from '../../model/types.ts';
import { putView } from '../../model/update.ts';
import type { Detail } from '../../style/types.ts';
import { layerState } from '../../view/effective.ts';
import type { View } from '../../view/types.ts';
import { storeyOf, styleOf, viewOf } from '../lookup.ts';
import { S } from '../schema.ts';
import { defineCommand, fail } from '../types.ts';

const SCALE = S.number('jmenovatel měřítka (50 = 1:50)', { exclusiveMinimum: 0 });
const change = (model: Model, id: Id, fn: (v: View) => View) => ({
  model: putView(model, fn(viewOf(model, id))),
});

export const viewCreate = defineCommand<{
  storeyId: Id;
  styleId: Id;
  scale?: number;
  name?: string;
  saved?: boolean;
}>({
  name: 'view.create',
  label: 'Nový pohled',
  description:
    'Vytvoří uložený pohled: podlaží + styl + měřítko (výchozí měřítko nabídne styl). saved: false = ' +
    'pracovní okno podlaží (bývá jen jedno, vzniká s podlažím).',
  group: 'Zobrazení',
  params: S.object(
    { storeyId: S.id, styleId: S.id, scale: SCALE, name: { type: 'string' }, saved: { type: 'boolean' } },
    ['storeyId', 'styleId'],
  ),
  run(model, p, ctx) {
    const storey = storeyOf(model, p.storeyId);
    const style = styleOf(model, p.styleId);
    const view: View = {
      id: ctx.newId(),
      name: p.name ?? `${storey.name} – ${style.name}`,
      storeyId: storey.id,
      crop: null,
      scale: p.scale ?? style.defaultScale,
      styleId: style.id,
      local: {},
      activeAnnotationLayerId: null,
      cutPlane: DEFAULT_CUT_HEIGHT,
      elementOverrides: {},
      phaseFilterId: null,
      saved: p.saved ?? true,
    };
    return { model: putView(model, view), created: [view.id] };
  },
});

export const viewSetStyle = defineCommand<{ viewId: Id; styleId: Id }>({
  name: 'view.setStyle',
  label: 'Přepnout styl',
  description:
    'Přepne styl pohledu jedním klikem. Místní úpravy se zruší, aktivní skupina anotací bude podle stylu.',
  group: 'Zobrazení',
  params: S.object({ viewId: S.id, styleId: S.id }, ['viewId', 'styleId']),
  run(model, p) {
    styleOf(model, p.styleId);
    return change(model, p.viewId, (v) => ({
      ...v,
      styleId: p.styleId,
      local: {},
      activeAnnotationLayerId: null,
    }));
  },
});

export const viewSetScale = defineCommand<{ viewId: Id; scale: number }>({
  name: 'view.setScale',
  label: 'Měřítko',
  description:
    'Změní měřítko pohledu. Mění jen tloušťky čar; texty, značky a šrafy mají pevnou velikost na papíře.',
  group: 'Zobrazení',
  params: S.object({ viewId: S.id, scale: SCALE }, ['viewId', 'scale']),
  run: (model, p) => change(model, p.viewId, (v) => ({ ...v, scale: p.scale })),
});

export const viewSetLayerState = defineCommand<{
  viewId: Id;
  layerId: Id;
  visible?: boolean;
  locked?: boolean;
}>({
  name: 'view.setLayerState',
  label: 'Vrstva v pohledu',
  description:
    'Zapne / vypne viditelnost nebo zámek vrstvy v pohledu (místní úprava stylu, označí „upraveno“).',
  group: 'Zobrazení',
  params: S.object(
    { viewId: S.id, layerId: S.id, visible: { type: 'boolean' }, locked: { type: 'boolean' } },
    ['viewId', 'layerId'],
  ),
  run(model, p) {
    if (!model.display.layers[p.layerId]) fail('not-found', 'Vrstva neexistuje');
    return change(model, p.viewId, (v) => {
      const combo =
        model.display.layerCombinations[model.display.styles[v.styleId]?.layerCombinationId ?? ''];
      const cur = v.local.layerStates?.[p.layerId] ??
        combo?.states[p.layerId] ?? { visible: true, locked: false };
      const next = { visible: p.visible ?? cur.visible, locked: p.locked ?? cur.locked };
      return { ...v, local: { ...v.local, layerStates: { ...v.local.layerStates, [p.layerId]: next } } };
    });
  },
});

export const viewSetDetail = defineCommand<{ viewId: Id; detail: Detail }>({
  name: 'view.setDetail',
  label: 'Podrobnost v pohledu',
  description: 'Změní podrobnost kresby v pohledu (místní úprava stylu).',
  group: 'Zobrazení',
  params: S.object({ viewId: S.id, detail: S.enumOf(['coarse', 'medium', 'fine'], 'podrobnost') }, [
    'viewId',
    'detail',
  ]),
  run: (model, p) => change(model, p.viewId, (v) => ({ ...v, local: { ...v.local, detail: p.detail } })),
});

export const viewResetToStyle = defineCommand<{ viewId: Id }>({
  name: 'view.resetToStyle',
  label: 'Vrátit styl',
  description: 'Zruší místní úpravy pohledu; pohled bude přesně podle stylu.',
  group: 'Zobrazení',
  params: S.object({ viewId: S.id }, ['viewId']),
  run: (model, p) => change(model, p.viewId, (v) => ({ ...v, local: {} })),
});

export const viewSetActiveAnnotationLayer = defineCommand<{ viewId: Id; layerId: Id | null }>({
  name: 'view.setActiveAnnotationLayer',
  label: 'Aktivní skupina anotací',
  description: 'Nastaví skupinu anotací, do které jdou nové kóty (null = výchozí podle stylu).',
  group: 'Zobrazení',
  params: S.object({ viewId: S.id, layerId: { oneOf: [S.id, { type: 'null' }] } }, ['viewId', 'layerId']),
  run(model, p) {
    if (p.layerId !== null && model.display.layers[p.layerId]?.kind !== 'annotation') {
      fail('invalid', 'Aktivní může být jen skupina anotací');
    }
    return change(model, p.viewId, (v) => ({ ...v, activeAnnotationLayerId: p.layerId }));
  },
});

export const viewSetOverrideCombination = defineCommand<{ viewId: Id; combinationId: Id | null }>({
  name: 'view.setOverrideCombination',
  label: 'Kombinace přepisů v pohledu',
  description:
    'Použije v pohledu jinou kombinaci grafických přepisů (např. fáze); null vrátí kombinaci ze stylu.',
  group: 'Zobrazení',
  params: S.object({ viewId: S.id, combinationId: { oneOf: [S.id, { type: 'null' }] } }, [
    'viewId',
    'combinationId',
  ]),
  run(model, p) {
    const id = p.combinationId;
    if (id !== null && !model.display.overrideCombinations[id]) fail('not-found', 'Kombinace neexistuje');
    return change(model, p.viewId, (v) => {
      const { overrideCombinationId: _old, ...local } = v.local;
      return { ...v, local: id === null ? local : { ...local, overrideCombinationId: id } };
    });
  },
});

export const viewSetLayerCombination = defineCommand<{ viewId: Id; combinationId: Id | null }>({
  name: 'view.setLayerCombination',
  label: 'Kombinace vrstev',
  description:
    'Nastaví pohledu kombinaci vrstev (které vrstvy jsou vidět a zamčené) jako místní úpravu stylu; ' +
    'null = podle stylu pohledu.',
  group: 'Zobrazení',
  params: S.object({ viewId: S.id, combinationId: { oneOf: [S.id, { type: 'null' }] } }, [
    'viewId',
    'combinationId',
  ]),
  run(model, p) {
    const combo = p.combinationId ? model.display.layerCombinations[p.combinationId] : null;
    if (p.combinationId && !combo) fail('not-found', 'Kombinace vrstev neexistuje');
    return change(model, p.viewId, (v) => {
      const { layerStates: _drop, ...rest } = v.local;
      return { ...v, local: combo ? { ...rest, layerStates: { ...combo.states } } : rest };
    });
  },
});

export const viewSetLayerStates = defineCommand<{
  viewId: Id;
  states: Record<Id, { visible?: boolean; locked?: boolean }>;
}>({
  name: 'view.setLayerStates',
  label: 'Vrstvy v pohledu',
  description:
    'Nastaví viditelnost nebo zámek více vrstev pohledu najednou (jeden krok Zpět), např. skrýt ostatní ' +
    'vrstvy nebo přepnout zobrazené / skryté.',
  group: 'Zobrazení',
  params: S.object(
    {
      viewId: S.id,
      states: { type: 'object', description: 'id vrstvy → { visible?, locked? }' },
    },
    ['viewId', 'states'],
  ),
  run(model, p) {
    return change(model, p.viewId, (v) => {
      const next = { ...v.local.layerStates };
      for (const [id, st] of Object.entries(p.states)) {
        if (!model.display.layers[id]) fail('not-found', `Vrstva ${id} neexistuje`);
        const cur = layerState(model.display, v, id);
        next[id] = { visible: st.visible ?? cur.visible, locked: st.locked ?? cur.locked };
      }
      return { ...v, local: { ...v.local, layerStates: next } };
    });
  },
});
