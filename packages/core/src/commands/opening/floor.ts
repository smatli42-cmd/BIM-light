// Příkaz: podlaha v otvoru až k podlaze (základ 14) – rozdělit do dělicí linie / celá z místnosti A
// (u referenčního líce) / celá z B (u protilehlého) / žádná. Ukládá se logicky u otvoru; obrysy podlah
// vázaných na místnost, povrch podlahy a spárořez se přepočítají z modelu.
import type { Id } from '../../ids/index.ts';
import { putOpenings } from '../../model/update.ts';
import { FLOOR_SPLITS, type FloorSplit } from '../../opening/types.ts';
import { S } from '../schema.ts';
import { defineCommand, fail } from '../types.ts';
import { OPENING_IDS, openingOf } from './shared.ts';

export const openingSetFloorSplit = defineCommand<{ openingIds: Id[]; split: FloorSplit }>({
  name: 'opening.setFloorSplit',
  label: 'Podlaha v otvoru',
  description:
    'Jak vede podlaha v průchozím otvoru až k podlaze (dveře): split = každá místnost do dělicí linie ' +
    '(osa stěny), ref = celá z místnosti u referenčního líce (A), opp = celá z místnosti u protilehlého ' +
    'líce (B), none = žádná. Plocha místnosti podle ČSN se nemění; podlaha (deska vázaná na místnost), ' +
    'povrch podlahy a spárořez proužek započítají.',
  group: 'Otvor',
  params: S.object(
    { openingIds: OPENING_IDS, split: S.enumOf(FLOOR_SPLITS, 'split / ref (A) / opp (B) / none') },
    ['openingIds', 'split'],
  ),
  run(model, p) {
    const ops = p.openingIds.map((id) => {
      const o = openingOf(model, id);
      if (o.kind !== 'through') fail('invalid', 'Podlaha vede jen průchozím otvorem (ne nikou)');
      return { ...o, floorSplit: p.split };
    });
    return { model: putOpenings(model, ops) };
  },
});
