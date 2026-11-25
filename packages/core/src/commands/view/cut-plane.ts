// Příkaz: rovina řezu půdorysu pohledu (plán stěn Z4; rozhodnutí 2: výchozí 1 m nad podlažím).
// Otvor, který rovinu protíná, stěnu přeruší; otvor celý nad ní nebo pod ní se kreslí čárkovaně.
// Mění jen vzhled pohledu, nikdy model.
import type { Id } from '../../ids/index.ts';
import { putView } from '../../model/update.ts';
import { viewOf } from '../lookup.ts';
import { S } from '../schema.ts';
import { defineCommand } from '../types.ts';

export const viewSetCutPlane = defineCommand<{ viewId: Id; height: number }>({
  name: 'view.setCutPlane',
  label: 'Rovina řezu',
  description: 'Nastaví výšku roviny řezu půdorysu nad úrovní podlaží (mm, výchozí 1000).',
  group: 'Zobrazení',
  params: S.object({ viewId: S.id, height: S.number('mm nad podlažím', { minimum: 0 }) }, [
    'viewId',
    'height',
  ]),
  run: (model, p) => ({ model: putView(model, { ...viewOf(model, p.viewId), cutPlane: p.height }) }),
});
