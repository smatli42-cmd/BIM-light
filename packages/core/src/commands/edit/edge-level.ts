// Příkaz: posunout vodorovnou hranu prvku na výšku (úchopy v řezu; základy 6, 25). Tažení úchopu v okně řezu
// i AI dávají stejný výsledek: příkaz spočítá volání wall.setHeight / slab.update / opening.update
// (section/edge-level.ts) a provede ho jedním krokem Undo.
import type { Id } from '../../ids/index.ts';
import { edgeCall, EDGES, type Edge } from '../../section/edge-level.ts';
import { openingUpdate } from '../opening/edit.ts';
import { S } from '../schema.ts';
import { slabUpdate } from '../slab/edit.ts';
import { defineCommand, fail, type CommandDef } from '../types.ts';
import { wallSetHeight } from '../wall/height.ts';

const RUNNERS: Record<string, CommandDef<never>['run']> = {
  'wall.setHeight': wallSetHeight.run as CommandDef<never>['run'],
  'slab.update': slabUpdate.run as CommandDef<never>['run'],
  'opening.update': openingUpdate.run as CommandDef<never>['run'],
};

export const elementSetEdgeLevel = defineCommand<{ elementId: Id; edge: Edge; z: number }>({
  name: 'element.setEdgeLevel',
  label: 'Posunout hranu prvku',
  description:
    'Posune horní nebo spodní hranu prvku na výšku z (mm nad ±0,000), jako tažení úchopu v řezu; druhá hrana ' +
    'stojí. Stěna: vršek = odsazení vršku (vazba na podlaží / desku zůstane, nespojená stěna změní výšku), ' +
    'spodek = odsazení spodku. Deska: tloušťku dává typ, posune se celá (horní líc nad podlažím). Otvor: ' +
    'bottom = parapet (nadpraží stojí), top = výška otvoru. Polohy úchopů: dotaz section.grips.',
  group: 'Úpravy',
  params: S.object(
    {
      elementId: S.id,
      edge: S.enumOf(EDGES, 'top = horní, bottom = spodní hrana'),
      z: S.number('mm nad ±0,000'),
    },
    ['elementId', 'edge', 'z'],
  ),
  run(model, p, ctx) {
    if (!model.elements[p.elementId] && !model.openings[p.elementId])
      fail('not-found', `Prvek ${p.elementId} neexistuje`);
    let call;
    try {
      call = edgeCall(model, p.elementId, p.edge, p.z);
    } catch (e) {
      return fail('invalid', (e as Error).message);
    }
    if (call.command === 'opening.update') {
      const { sill, height } = call.params as { sill: number; height: number };
      if (height <= 0) fail('invalid', 'Horní hrana otvoru musí být nad spodní');
      if (sill < 0) fail('invalid', 'Parapet nemůže být pod spodkem stěny');
    }
    const run = RUNNERS[call.command] as CommandDef<never>['run'];
    return run(model, call.params as never, ctx);
  },
});
