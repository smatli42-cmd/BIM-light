// Příkazy výškové kóty v půdorysu (české zvyklosti, Ardit): vložení v bodě (horní líc desky pod bodem, jinak
// úroveň podlaží), posun, úprava (značka rámeček / kroužek, absolutní, vrstva, zámek). Mazání jako u kót
// v řezu (levelDim.delete, selection.delete levelDimIds).
import type { Vec2 } from '../../geometry/index.ts';
import type { Id } from '../../ids/index.ts';
import {
  PLAN_LEVEL_MARKERS,
  planLevelRef,
  type PlanLevelDimension,
  type PlanLevelMarker,
} from '../../level-dim/plan.ts';
import type { LevelRef } from '../../level-dim/types.ts';
import { levelZ } from '../../level-dim/value.ts';
import type { Model } from '../../model/types.ts';
import { activeAnnotationLayer } from '../../view/effective.ts';
import { storeyOf, viewOf } from '../lookup.ts';
import { S, type JsonSchema } from '../schema.ts';
import { defineCommand, fail } from '../types.ts';
import { REF } from './level-dim.ts';

const planOf = (m: Model, id: Id): PlanLevelDimension =>
  m.planLevelDims[id] ?? fail('not-found', `Výšková kóta ${id} neexistuje`);
const put = (m: Model, d: PlanLevelDimension): Model => {
  if (levelZ(m, d.ref) === null) fail('not-found', 'Kótovaná deska ani podlaží neexistuje');
  if (m.display.layers[d.annotationLayerId]?.kind !== 'annotation')
    fail('not-found', 'Vrstva výškové kóty musí být skupina anotací');
  return { ...m, planLevelDims: { ...m.planLevelDims, [d.id]: d } };
};

const FIELDS: Record<string, JsonSchema> = {
  marker: S.enumOf(
    PLAN_LEVEL_MARKERS,
    'značka: box = hodnota v rámečku (výchozí), circle = kroužek s poličkou',
  ),
  absolute: { type: 'boolean', description: 'absolutní kóta v m n. m. Bpv' },
  annotationLayerId: S.id,
};
type Fields = { marker?: PlanLevelMarker; absolute?: boolean; annotationLayerId?: Id };

/** Skupina anotací: zadaná, aktivní skupina pohledu, nebo výchozí stylu prvního pohledu podlaží. */
function layerFor(m: Model, storeyId: Id, viewId?: Id, given?: Id): Id {
  if (given) return given;
  const view = viewId ? viewOf(m, viewId) : Object.values(m.views).find((v) => v.storeyId === storeyId);
  return view ? activeAnnotationLayer(m, view) : '';
}

export const planLevelDimCreate = defineCommand<
  Fields & { storeyId: Id; point: Vec2; textAt?: Vec2; ref?: LevelRef; viewId?: Id }
>({
  name: 'planLevelDim.create',
  label: 'Výšková kóta v půdorysu',
  description:
    'Vloží výškovou kótu do půdorysu podlaží: point = kótovaný bod (mm), textAt = poloha hodnoty (výchozí ' +
    'v bodě). Kótuje horní líc nejvyšší desky / podlahy pod bodem, jinak úroveň podlaží (ref jde zadat). ' +
    'marker = box (hodnota v rámečku) / circle (kroužek s poličkou: nahoře k ±0,000, dole nad podlažím), ' +
    'viewId = pohled (skupina anotací = jeho aktivní).',
  group: 'Kóta',
  params: S.object({ storeyId: S.id, point: S.point, textAt: S.point, ref: REF, viewId: S.id, ...FIELDS }, [
    'storeyId',
    'point',
  ]),
  run(model, p, ctx) {
    storeyOf(model, p.storeyId);
    const d: PlanLevelDimension = {
      id: ctx.newId(),
      storeyId: p.storeyId,
      ref: p.ref ?? planLevelRef(model, p.storeyId, p.point),
      point: p.point,
      textAt: p.textAt ?? p.point,
      marker: p.marker ?? 'box',
      absolute: p.absolute ?? false,
      annotationLayerId: layerFor(model, p.storeyId, p.viewId, p.annotationLayerId),
      locked: false,
    };
    return { model: put(model, d), created: [d.id] };
  },
});

export const planLevelDimMove = defineCommand<{ levelDimId: Id; delta: Vec2; textOnly?: boolean }>({
  name: 'planLevelDim.move',
  label: 'Posunout výškovou kótu v půdorysu',
  description:
    'Posune výškovou kótu v půdorysu o delta (mm); textOnly = jen hodnotu (kroužek zůstane). Kótovaná deska ' +
    'se nemění. Zamčenou ne.',
  group: 'Kóta',
  params: S.object({ levelDimId: S.id, delta: S.point, textOnly: { type: 'boolean' } }, [
    'levelDimId',
    'delta',
  ]),
  run(model, p) {
    const d = planOf(model, p.levelDimId);
    if (d.locked) fail('lock-violation', 'Výšková kóta je zamčená');
    const add = (q: Vec2) => ({ x: q.x + p.delta.x, y: q.y + p.delta.y });
    return { model: put(model, { ...d, point: p.textOnly ? d.point : add(d.point), textAt: add(d.textAt) }) };
  },
});

export const planLevelDimUpdate = defineCommand<
  Fields & { levelDimId: Id; ref?: LevelRef; locked?: boolean }
>({
  name: 'planLevelDim.update',
  label: 'Upravit výškovou kótu v půdorysu',
  description: 'Změní značku (box / circle), absolutní, vrstvu, ref nebo zámek. Zamčenou jde jen odemknout.',
  group: 'Kóta',
  params: S.object({ levelDimId: S.id, ref: REF, ...FIELDS, locked: { type: 'boolean' } }, ['levelDimId']),
  run(model, p) {
    const d = planOf(model, p.levelDimId);
    const { levelDimId: _id, ...patch } = p;
    if (d.locked && !Object.keys(patch).every((k) => k === 'locked'))
      fail('lock-violation', 'Výšková kóta je zamčená');
    return { model: put(model, { ...d, ...patch }) };
  },
});
