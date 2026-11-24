// Příkazy: výška stěny a horní profil (základ 12, plán stěn Z3).
import type { Id } from '../../ids/index.ts';
import { heightError, type HeightBinding } from '../../model/height.ts';
import { putElements } from '../../model/update.ts';
import { topProfileError, type TopProfile } from '../../wall-height/top-profile.ts';
import { wallOf } from '../lookup.ts';
import { S, type JsonSchema } from '../schema.ts';
import { defineCommand, fail } from '../types.ts';
import { HEIGHT_SCHEMA, WALL_IDS } from './shared.ts';

const { baseStoreyId: _base, ...INPUT_PROPS } = HEIGHT_SCHEMA.properties ?? {};
const HEIGHT_INPUT: JsonSchema = S.object(INPUT_PROPS, ['baseOffset', 'top']);

type HeightInput = Omit<HeightBinding, 'baseStoreyId'>;

export const wallSetHeight = defineCommand<{ wallIds: Id[]; height: HeightInput }>({
  name: 'wall.setHeight',
  label: 'Výška stěny',
  description:
    'Nastaví spodek a vršek stěn (základ 12): spodek = podlaží + odsazení; vršek = pevná výška ' +
    '(„nespojeno“) nebo podlaží + N + odsazení (N = 1 podlaží nad, 2 = přes dvě podlaží…). ' +
    'Spodní podlaží je vždy podlaží stěny.',
  group: 'Stěna',
  params: S.object({ wallIds: WALL_IDS, height: HEIGHT_INPUT }, ['wallIds', 'height']),
  run(model, p) {
    const walls = p.wallIds.map((id) => {
      const w = wallOf(model, id);
      const height: HeightBinding = { ...p.height, baseStoreyId: w.storeyId };
      const err = heightError(model, height);
      if (err) fail('invalid', err);
      return { ...w, height };
    });
    return { model: putElements(model, walls) };
  },
});

const POINT = S.object({ x: S.number('mm po stěně'), z: S.number('mm nad spodkem') }, ['x', 'z']);
const PROFILE_SCHEMA: JsonSchema = {
  oneOf: [
    S.object({ kind: S.enumOf(['flat'], 'rovný') }, ['kind']),
    S.object(
      { kind: S.enumOf(['polygon'], 'polygon'), points: { type: 'array', items: POINT, minItems: 2 } },
      ['kind', 'points'],
    ),
  ],
};

export const wallSetTopProfile = defineCommand<{ wallIds: Id[]; topProfile: TopProfile }>({
  name: 'wall.setTopProfile',
  label: 'Horní profil stěny',
  description:
    'Nastaví horní profil stěn: rovný, nebo polygon bodů {x po stěně, z nad spodkem} (mm). ' +
    'Zatím jen data – výpočty a export berou rovný vršek (plán stěn Z3, rozhodnutí B).',
  group: 'Stěna',
  params: S.object({ wallIds: WALL_IDS, topProfile: PROFILE_SCHEMA }, ['wallIds', 'topProfile']),
  run(model, p) {
    const err = topProfileError(p.topProfile);
    if (err) fail('invalid', err);
    const walls = p.wallIds.map((id) => ({ ...wallOf(model, id), topProfile: p.topProfile }));
    return { model: putElements(model, walls) };
  },
});
