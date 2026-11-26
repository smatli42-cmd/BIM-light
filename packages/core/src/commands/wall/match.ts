// Příkaz: přenést vlastnosti z jedné stěny na jiné (plán stěn Z9; Revit „Match Type Properties“,
// Archicad pipeta a stříkačka). Typ, výška (odsazení a vršek; spodní podlaží cílové stěny zůstane),
// přepisy vlastností a volitelně stav. Poloha a referenční čára se nemění.
import type { Id } from '../../ids/index.ts';
import { heightError } from '../../model/height.ts';
import { putElements } from '../../model/update.ts';
import type { Wall } from '../../wall/types.ts';
import { wallOf } from '../lookup.ts';
import { S } from '../schema.ts';
import { defineCommand, fail } from '../types.ts';
import { normalizeRefLines } from '../wall-type/shared.ts';
import { WALL_IDS } from './shared.ts';

export const MATCH_PARTS = ['type', 'height', 'properties', 'status'] as const;
export type MatchPart = (typeof MATCH_PARTS)[number];
/** Výchozí přenos: typ, výška a vlastnosti; stav (rekonstrukce) jen na vyžádání. */
export const DEFAULT_MATCH: readonly MatchPart[] = ['type', 'height', 'properties'];

function matched(src: Wall, w: Wall, parts: ReadonlySet<MatchPart>): Wall {
  const { properties: _p, ...rest } = w;
  const base: Wall = parts.has('properties')
    ? src.properties
      ? { ...rest, properties: src.properties }
      : rest
    : w;
  return {
    ...base,
    typeId: parts.has('type') ? src.typeId : w.typeId,
    status: parts.has('status') ? src.status : w.status,
    height: parts.has('height') ? { ...src.height, baseStoreyId: w.height.baseStoreyId } : w.height,
    topProfile: parts.has('height') ? src.topProfile : w.topProfile,
  };
}

export const wallMatchProperties = defineCommand<{ sourceWallId: Id; wallIds: Id[]; include?: MatchPart[] }>({
  name: 'wall.matchProperties',
  label: 'Přenést vlastnosti',
  description:
    'Přenese vlastnosti ze zdrojové stěny na zadané stěny (pipeta): include = type (typ), height (výška: ' +
    'odsazení spodku a vršek, spodní podlaží cílové stěny zůstane), properties (přepisy vlastností), ' +
    'status (stav). Výchozí: type, height, properties. Poloha a referenční čára se nemění.',
  group: 'Stěna',
  params: S.object(
    {
      sourceWallId: S.id,
      wallIds: WALL_IDS,
      include: { type: 'array', items: S.enumOf(MATCH_PARTS, 'co přenést'), minItems: 1 },
    },
    ['sourceWallId', 'wallIds'],
  ),
  run(model, p) {
    const src = wallOf(model, p.sourceWallId);
    const parts = new Set(p.include ?? DEFAULT_MATCH);
    const walls = p.wallIds.filter((id) => id !== src.id).map((id) => matched(src, wallOf(model, id), parts));
    for (const w of walls) {
      const err = heightError(model, w.height);
      if (err) fail('invalid', `Výšku nejde přenést: ${err}`);
    }
    return { model: normalizeRefLines(putElements(model, walls)) };
  },
});
