// Příkaz: nový otvor ve stěně (plán stěn Z4, základ 19). Poloha = vzdálenost počátku otvoru od začátku
// referenční čáry (`offset`), nebo střed otvoru v bodě (`center`, klik na stěnu).
import type { Vec2 } from '../../geometry/index.ts';
import type { Id } from '../../ids/index.ts';
import { STATUSES, type Status } from '../../model/types.ts';
import { putOpenings } from '../../model/update.ts';
import { lengthAt } from '../../opening/along.ts';
import { DEFAULT_OPENING, type Opening, type OpeningKind, type OpeningSide } from '../../opening/types.ts';
import { wallOf } from '../lookup.ts';
import { S, type JsonSchema } from '../schema.ts';
import { defineCommand, fail } from '../types.ts';
import { assertOpenings } from './shared.ts';

export interface OpeningSize {
  width?: number;
  height?: number;
  sill?: number;
  kind?: OpeningKind;
  depth?: number;
  side?: OpeningSide;
  status?: Status;
  discipline?: string;
}

export const OPENING_SIZE_PROPS: Record<string, JsonSchema> = {
  width: S.number('šířka otvoru (mm)', { exclusiveMinimum: 0 }),
  height: S.number('výška otvoru (mm)', { exclusiveMinimum: 0 }),
  sill: S.number('parapet: spodní hrana nad spodkem stěny (mm)', { minimum: 0 }),
  kind: S.enumOf(['through', 'niche'], 'průchozí otvor, nebo nika'),
  depth: S.number('hloubka niky od líce (mm)', { exclusiveMinimum: 0 }),
  side: S.enumOf(['ref', 'opp'], 'strana niky: referenční, nebo protilehlý líc'),
  status: S.enumOf(STATUSES, 'stav'),
  discipline: { type: 'string' },
};

export interface OpeningCreateParams extends OpeningSize {
  wallId: Id;
  offset?: number;
  center?: Vec2;
}

export const openingCreate = defineCommand<OpeningCreateParams>({
  name: 'opening.create',
  label: 'Otvor',
  description:
    'Vytvoří otvor ve stěně: průchozí, nebo niku (hloubka + strana). Poloha je offset = vzdálenost ' +
    'počátku otvoru od začátku referenční čáry (mm), nebo center = bod, kde má být střed otvoru. ' +
    'Výchozí 1200 × 1500, parapet 900. Otvor musí ležet celý ve stěně.',
  group: 'Otvor',
  icon: 'opening',
  shortcut: 'O',
  params: S.object(
    { wallId: S.id, offset: S.number('mm od začátku stěny'), center: S.point, ...OPENING_SIZE_PROPS },
    ['wallId'],
  ),
  run(model, p, ctx) {
    const wall = wallOf(model, p.wallId);
    const width = p.width ?? DEFAULT_OPENING.width;
    const offset =
      p.offset ??
      (p.center
        ? lengthAt(wall.path, p.center) - width / 2
        : fail('invalid-params', 'Chybí offset nebo center'));
    const opening: Opening = {
      id: ctx.newId(),
      ifcClass: 'IfcOpeningElement',
      category: 'opening',
      discipline: p.discipline ?? wall.discipline,
      status: p.status ?? 'new',
      variant: ctx.variant,
      storeyId: wall.storeyId,
      hostId: wall.id,
      offset,
      width,
      height: p.height ?? DEFAULT_OPENING.height,
      sill: p.sill ?? DEFAULT_OPENING.sill,
      kind: p.kind ?? 'through',
      depth: p.depth ?? DEFAULT_OPENING.depth,
      side: p.side ?? 'ref',
      profile: { kind: 'rect' },
    };
    return { model: assertOpenings(putOpenings(model, [opening]), [opening.id]), created: [opening.id] };
  },
});
