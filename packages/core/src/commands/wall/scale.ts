// Příkaz Změnit velikost (Ctrl+K, jako Resize v Archicadu; vzor ze screenshotu Arditu 2026-11-26):
// vzdálenosti od výchozího bodu se změní v poměru, tloušťky stěn zůstávají. Otvory ve vybraných stěnách
// drží poměrnou polohu (střed); rozměry oken a dveří se mění jen na přání (šířka, výška a parapet stojí,
// protože výšky stěn se také nemění).
import { scalePath, type Vec2 } from '../../geometry/index.ts';
import type { Id } from '../../ids/index.ts';
import type { Model } from '../../model/types.ts';
import { putOpenings } from '../../model/update.ts';
import { S } from '../schema.ts';
import { defineCommand, fail } from '../types.ts';
import { transformWalls } from './move.ts';
import { WALL_IDS } from './shared.ts';

export interface ScaleParams {
  wallIds: Id[];
  origin: Vec2;
  /** Poměr: 1,1 = o 10 % větší, 0,5 = poloviční. */
  factor: number;
  /** Změnit i šířku otvorů (okna, dveře); výchozí ne. */
  scaleOpenings?: boolean;
}

/** Otvory ve změněných stěnách: střed otvoru zůstane na stejném poměrném místě stěny. */
function scaleOpeningsIn(model: Model, ids: ReadonlySet<Id>, k: number, resize: boolean): Model {
  const ops = Object.values(model.openings)
    .filter((o) => ids.has(o.hostId))
    .map((o) => {
      const width = resize ? o.width * k : o.width;
      const center = (o.offset + o.width / 2) * k;
      return { ...o, width, offset: center - width / 2 };
    });
  return ops.length ? putOpenings(model, ops) : model;
}

export function scaleWalls(model: Model, p: ScaleParams): Model {
  if (!(p.factor > 0)) fail('invalid', 'Poměr změny velikosti musí být kladný.');
  const scaled = transformWalls(model, p.wallIds, (path) => scalePath(path, p.origin, p.factor));
  return scaleOpeningsIn(scaled, new Set(p.wallIds), p.factor, p.scaleOpenings ?? false);
}

export const wallScale = defineCommand<ScaleParams>({
  name: 'wall.scale',
  label: 'Změnit velikost',
  description:
    'Změní velikost vybraných stěn kolem výchozího bodu v poměru factor (1.1 = +10 %): vzdálenosti od ' +
    'bodu se vynásobí, tloušťky a výšky zůstávají. Otvory ve stěnách drží poměrnou polohu středu; ' +
    'scaleOpenings = true změní i jejich šířku. Napojené nevybrané stěny se natáhnou.',
  group: 'Úpravy',
  icon: 'scale',
  shortcut: 'Ctrl+K',
  params: S.object(
    {
      wallIds: WALL_IDS,
      origin: S.point,
      factor: S.number('poměr (1 = beze změny)', { exclusiveMinimum: 0 }),
      scaleOpenings: { type: 'boolean' },
    },
    ['wallIds', 'origin', 'factor'],
  ),
  run: (model, p) => ({ model: scaleWalls(model, p) }),
});
