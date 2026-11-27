// Příkazy vzhledu 3D pohledu (lišta 3D okna podle Ardit Designeru): projekce, režim zobrazení, slunce
// a stíny, rovina řezu, mřížka. Nic z toho nemění prvky modelu.
import type { Id } from '../../ids/index.ts';
import {
  PROJECTIONS,
  RENDER_MODES,
  type CutPlane3d,
  type Projection3d,
  type RenderMode3d,
  type Sun3d,
} from '../../view-3d/types.ts';
import { S, type JsonSchema } from '../schema.ts';
import { defineCommand, fail } from '../types.ts';
import { POINT3, putView3d, view3dOf } from './view-3d.ts';

const viewParam = (key: string, schema: JsonSchema) =>
  S.object({ viewId: S.id, [key]: schema }, ['viewId', key]);

export const view3dSetProjection = defineCommand<{ viewId: Id; projection: Projection3d }>({
  name: 'view3d.setProjection',
  label: 'Projekce 3D',
  description: 'Přepne 3D pohled na perspektivu (perspective), nebo axonometrii (axonometric).',
  group: 'Zobrazení',
  params: viewParam('projection', S.enumOf(PROJECTIONS, 'perspective | axonometric')),
  run: (model, p) => ({
    model: putView3d(model, { ...view3dOf(model, p.viewId), projection: p.projection }),
  }),
});

export const view3dSetRenderMode = defineCommand<{ viewId: Id; mode: RenderMode3d }>({
  name: 'view3d.setRenderMode',
  label: 'Režim zobrazení 3D',
  description:
    'Režim zobrazení 3D pohledu: materials = materiály, white = bílý model, wireframe = čárový (drátový), ' +
    'hidden-lines = skryté hrany, sketch = skica (bílý model, kreslené hrany a stíny).',
  group: 'Zobrazení',
  params: viewParam('mode', S.enumOf(RENDER_MODES, 'režim zobrazení')),
  run: (model, p) => ({
    model: putView3d(model, { ...view3dOf(model, p.viewId), renderMode: p.mode }),
  }),
});

const SUN = S.object(
  {
    shadows: { type: 'boolean', description: 'vrhat stíny' },
    mode: S.enumOf(['manual', 'time'], 'manual = azimut a výška, time = podle data a času v místě stavby'),
    azimuth: S.number('° od severu po směru hodin'),
    altitude: S.number('° nad obzorem (0–90)'),
    date: { type: 'string', description: 'RRRR-MM-DD' },
    time: { type: 'string', description: 'HH:MM místního času' },
  },
  [],
);

function validSun(s: Sun3d): Sun3d {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s.date)) fail('invalid', 'Datum musí být RRRR-MM-DD');
  if (!/^\d{1,2}:\d{2}$/.test(s.time)) fail('invalid', 'Čas musí být HH:MM');
  if (s.altitude < 0 || s.altitude > 90) fail('invalid', 'Výška slunce musí být 0–90°');
  return { ...s, azimuth: ((s.azimuth % 360) + 360) % 360 };
}

export const view3dSetSun = defineCommand<{ viewId: Id; sun: Partial<Sun3d> }>({
  name: 'view3d.setSun',
  label: 'Slunce a stíny',
  description:
    'Nastaví slunce 3D pohledu (jen uvedené položky): shadows = stíny, mode manual (azimuth, altitude) ' +
    'nebo time (date, time – poloha podle georeference stavby). Vypočtenou polohu ukáže view3d.list.',
  group: 'Zobrazení',
  params: viewParam('sun', SUN),
  run(model, p) {
    const v = view3dOf(model, p.viewId);
    return { model: putView3d(model, { ...v, sun: validSun({ ...v.sun, ...p.sun }) }) };
  },
});

export const view3dSetCutPlane = defineCommand<{ viewId: Id; plane: CutPlane3d | null }>({
  name: 'view3d.setCutPlane',
  label: 'Řez ve 3D',
  description:
    'Ořízne 3D pohled rovinou: origin = bod roviny (mm), normal = směr, kterým model zůstane ' +
    '(např. směr pohledu); null = bez 3D řezu. Řezné plochy se nevyplňují.',
  group: 'Zobrazení',
  params: viewParam('plane', {
    oneOf: [S.object({ origin: POINT3, normal: POINT3 }, ['origin', 'normal']), { type: 'null' }],
    description: 'rovina řezu, null = vypnout',
  }),
  run(model, p) {
    const v = view3dOf(model, p.viewId);
    if (!p.plane) return { model: putView3d(model, { ...v, cutPlane: null }) };
    const { x, y, z } = p.plane.normal;
    const len = Math.hypot(x, y, z);
    if (len < 1e-9) fail('invalid', 'Směr roviny řezu nesmí být nulový');
    const normal = { x: x / len, y: y / len, z: z / len };
    return { model: putView3d(model, { ...v, cutPlane: { origin: p.plane.origin, normal } }) };
  },
});

export const view3dSetGrid = defineCommand<{ viewId: Id; grid: boolean }>({
  name: 'view3d.setGrid',
  label: 'Mřížka ve 3D',
  description: 'Zapne / vypne mřížku v pracovní rovině 3D pohledu (úroveň aktivního podlaží).',
  group: 'Zobrazení',
  params: viewParam('grid', { type: 'boolean' }),
  run: (model, p) => ({ model: putView3d(model, { ...view3dOf(model, p.viewId), grid: p.grid }) }),
});
