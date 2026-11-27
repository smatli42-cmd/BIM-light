// Příkazy: vršek stěny k desce a odpojení (desky D4; Revit „Attach Top / Detach Top“, Archicad
// „spojit s deskou“). Vazba je druh vršku ve výšce stěny – stěna se přepočítá se změnou desky.
import type { Id } from '../../ids/index.ts';
import { heightError, type HeightBinding } from '../../model/height.ts';
import { putElements } from '../../model/update.ts';
import { detachedTop, slabAboveWall } from '../../wall-height/attach.ts';
import { wallOf } from '../lookup.ts';
import { S } from '../schema.ts';
import { slabOf } from '../slab/shared.ts';
import { defineCommand, fail } from '../types.ts';
import { WALL_IDS } from './shared.ts';

export const wallAttachTop = defineCommand<{ wallIds: Id[]; slabId?: Id; offset?: number }>({
  name: 'wall.attachTop',
  label: 'Vršek k desce',
  description:
    'Připojí vršek stěn ke spodnímu líci desky (Revit Attach Top): výška stěny pak sleduje desku – ' +
    'změna výšky nebo tloušťky desky stěnu přepočítá. Bez slabId se u každé stěny najde deska nad ní ' +
    '(obrys nad osou stěny, nejnižší spodní líc nad spodkem stěny). offset = odsazení od spodního líce (mm).',
  group: 'Stěna',
  params: S.object(
    { wallIds: WALL_IDS, slabId: S.id, offset: S.number('odsazení vršku od spodního líce desky (mm)') },
    ['wallIds'],
  ),
  run(model, p) {
    const explicit = p.slabId ? slabOf(model, p.slabId) : null;
    const walls = p.wallIds.map((id) => {
      const w = wallOf(model, id);
      const slab = explicit ?? slabAboveWall(model, w);
      if (!slab) fail('invalid', `Nad stěnou ${id} není žádná deska`);
      const height: HeightBinding = {
        ...w.height,
        top: { kind: 'slab', slabId: slab.id, offset: p.offset ?? 0 },
      };
      const err = heightError(model, height);
      if (err) fail('invalid', err);
      return { ...w, height };
    });
    return { model: putElements(model, walls) };
  },
});

export const wallDetachTop = defineCommand<{ wallIds: Id[] }>({
  name: 'wall.detachTop',
  label: 'Odpojit vršek od desky',
  description:
    'Odpojí vršek stěn od desky (Revit Detach Top). Výška zůstane stejná, vršek se váže na podlaží + 1 ' +
    's odsazením (nad nejvyšším podlažím pevná výška). Stěny bez vazby na desku se nemění.',
  group: 'Stěna',
  params: S.object({ wallIds: WALL_IDS }, ['wallIds']),
  run(model, p) {
    const walls = p.wallIds
      .map((id) => wallOf(model, id))
      .filter((w) => w.height.top.kind === 'slab')
      .map((w) => ({ ...w, height: { ...w.height, top: detachedTop(model, w.height) } }));
    return { model: putElements(model, walls) };
  },
});
