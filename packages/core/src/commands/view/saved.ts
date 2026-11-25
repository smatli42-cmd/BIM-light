// Příkazy uložených pohledů (koncepce rozhraní, část 4): uložit pohled z okna, načíst nastavení okna,
// přejmenovat a smazat. Pracovní okno podlaží smazat nejde (zanikne s podlažím).
import type { Id } from '../../ids/index.ts';
import { omitIds, putView } from '../../model/update.ts';
import type { View } from '../../view/types.ts';
import { freeViewName } from '../../view/working.ts';
import { storeyOf, viewOf } from '../lookup.ts';
import { S } from '../schema.ts';
import { defineCommand, fail } from '../types.ts';

/** Nastavení zobrazení, která se kopírují mezi okny (bez místa a jména). */
const settingsOf = (v: View) => ({
  styleId: v.styleId,
  scale: v.scale,
  local: v.local,
  activeAnnotationLayerId: v.activeAnnotationLayerId,
  cutPlane: v.cutPlane,
  elementOverrides: v.elementOverrides,
  crop: v.crop,
});

export const viewSave = defineCommand<{ viewId: Id; name?: string }>({
  name: 'view.save',
  label: 'Uložit pohled',
  description:
    'Uloží pohled z okna (pracovního i uloženého): stejné podlaží a nastavení zobrazení, pevně. Výchozí ' +
    'název „Půdorys <podlaží>“.',
  group: 'Zobrazení',
  params: S.object({ viewId: S.id, name: { type: 'string' } }, ['viewId']),
  run(model, p, ctx) {
    const src = viewOf(model, p.viewId);
    const storey = storeyOf(model, src.storeyId);
    const name = p.name?.trim() || freeViewName(model, `Půdorys ${storey.name}`);
    const view: View = { ...src, ...settingsOf(src), id: ctx.newId(), name, saved: true };
    return { model: putView(model, view), created: [view.id] };
  },
});

export const viewLoadSettings = defineCommand<{ viewId: Id; fromViewId: Id }>({
  name: 'view.loadSettings',
  label: 'Načíst nastavení okna',
  description: 'Přepíše nastavení zobrazení pohledu nastavením jiného okna (styl, měřítko, řezná rovina…).',
  group: 'Zobrazení',
  params: S.object({ viewId: S.id, fromViewId: S.id }, ['viewId', 'fromViewId']),
  run(model, p) {
    const v = viewOf(model, p.viewId);
    return { model: putView(model, { ...v, ...settingsOf(viewOf(model, p.fromViewId)) }) };
  },
});

export const viewRename = defineCommand<{ viewId: Id; name: string }>({
  name: 'view.rename',
  label: 'Přejmenovat pohled',
  description: 'Změní název pohledu (uloženého i pracovního okna podlaží).',
  group: 'Zobrazení',
  params: S.object({ viewId: S.id, name: { type: 'string', description: 'nový název' } }, ['viewId', 'name']),
  run(model, p) {
    if (!p.name.trim()) fail('invalid', 'Název pohledu nesmí být prázdný');
    return { model: putView(model, { ...viewOf(model, p.viewId), name: p.name.trim() }) };
  },
});

export const viewDelete = defineCommand<{ viewId: Id }>({
  name: 'view.delete',
  label: 'Smazat pohled',
  description: 'Smaže uložený pohled. Pracovní okno podlaží smazat nejde (zanikne se smazáním podlaží).',
  group: 'Zobrazení',
  params: S.object({ viewId: S.id }, ['viewId']),
  run(model, p) {
    const v = viewOf(model, p.viewId);
    if (!v.saved) fail('invalid', 'Pracovní okno podlaží smazat nejde');
    return { model: { ...model, views: omitIds(model.views, [v.id]) } };
  },
});
