// Společné části příkazů elektro (koncepce 3): vyhledání, schémata parametrů, hostitel ze zadání.
import { SLOT_GLYPHS } from '../../electro/glyphs.ts';
import { hostOnWall } from '../../electro/follow.ts';
import {
  SLOT_LAYOUTS,
  type ElectroElement,
  type ElectroHost,
  type ElectroType,
} from '../../electro/types.ts';
import type { Vec2 } from '../../geometry/index.ts';
import { pathLength } from '../../geometry/index.ts';
import type { Id } from '../../ids/index.ts';
import type { Model } from '../../model/types.ts';
import { wallOf } from '../lookup.ts';
import { S, type JsonSchema } from '../schema.ts';
import { fail } from '../types.ts';

export const GROUP = 'Elektro';

export const electroOf = (m: Model, id: Id): ElectroElement =>
  m.electroElements[id] ?? fail('not-found', `Elektro prvek ${id} neexistuje`);

export const electroTypeOf = (m: Model, id: Id): ElectroType =>
  m.electroTypes[id] ?? fail('not-found', `Typ elektro ${id} neexistuje`);

export const putElectro = (m: Model, els: readonly ElectroElement[]): Model => ({
  ...m,
  electroElements: { ...m.electroElements, ...Object.fromEntries(els.map((e) => [e.id, e])) },
});

const nullable = (s: JsonSchema, description: string): JsonSchema => ({
  oneOf: [s, { type: 'null' }],
  description,
});

export const SIDE = S.enumOf(['ref', 'opp'], 'strana stěny: ref = referenční líc, opp = protilehlý');
export const SLOTS: JsonSchema = {
  type: 'array',
  minItems: 1,
  maxItems: 6,
  items: S.enumOf(SLOT_GLYPHS, 'slot rámečku'),
  description: 'sloty rámečku zleva doprava (Ardit „Rámeček“)',
};
export const LAYOUT = S.enumOf(SLOT_LAYOUTS, 'rozložení slotů: row = vedle sebe, column = pod sebou');
export const SYMBOL = S.object(
  {
    size: S.number('velikost značky v mm na papíře (výchozí 4)', { exclusiveMinimum: 0 }),
    along: S.number('odsazení značky podél stěny (mm na papíře)'),
    out: S.number('odsazení značky od stěny (mm na papíře)'),
    rotation: S.number('natočení značky (°)'),
  },
  [],
);
export const BOARD = S.object(
  {
    width: S.number('šířka skříně (mm)', { exclusiveMinimum: 0 }),
    height: S.number('výška skříně (mm)', { exclusiveMinimum: 0 }),
    depth: S.number('hloubka skříně (mm)', { exclusiveMinimum: 0 }),
    recess: S.number('zapuštění do stěny (mm)', { minimum: 0 }),
  },
  [],
);

/** Parametry polohy a vlastností instance (create i update). */
export const PLACEMENT_PROPS: Record<string, JsonSchema> = {
  wallId: S.id,
  offset: S.number('poloha podél referenční čáry stěny od začátku (mm)'),
  side: SIDE,
  point: S.point,
  angle: S.number('natočení volného prvku (°, proti směru hodin)'),
  mark: { type: 'string', description: 'označení (S2a, Z1, RH…)' },
  layout: LAYOUT,
  symbol: SYMBOL,
};

export const NULLABLE = {
  height: nullable(
    S.number('výška osy nad podlahou (mm)'),
    'výška osy nad podlahou (mm); null = výchozí výška typu',
  ),
  slots: nullable(SLOTS, 'sloty rámečku; null = podle typu'),
  board: nullable(BOARD, 'rozměry rozvaděče; null = podle typu'),
  length: nullable(
    S.number('délka (mm)', { exclusiveMinimum: 0 }),
    'délka liniového svítidla; null = podle typu',
  ),
};

export interface HostParams {
  wallId?: Id;
  offset?: number;
  side?: 'ref' | 'opp';
  point?: Vec2;
  angle?: number;
}

/** Hostitel ze zadání: stěna (poloha po stěně, nebo bod promítnutý na stěnu) nebo volný bod. */
export function hostFrom(m: Model, el: ElectroElement, p: HostParams): ElectroElement {
  if (p.wallId === undefined) {
    if (!p.point)
      fail('invalid', 'Zadejte wallId (prvek na stěně) nebo point (prvek na stropě / v místnosti)');
    return { ...el, host: { kind: 'free', point: p.point, angle: p.angle ?? 0 } };
  }
  const w = wallOf(m, p.wallId);
  const placed =
    p.offset === undefined && p.point
      ? hostOnWall(m, el, w, p.point)
      : { ...el, storeyId: w.storeyId, host: wallHost(w.id, p.offset ?? 0, p.side ?? 'ref') };
  checkOnWall(m, placed);
  return placed;
}

const wallHost = (wallId: Id, offset: number, side: 'ref' | 'opp'): ElectroHost => ({
  kind: 'wall',
  wallId,
  offset,
  side,
});

/** Poloha musí ležet na stěně (0 až délka referenční čáry). */
export function checkOnWall(m: Model, el: ElectroElement) {
  if (el.host.kind !== 'wall') return;
  const len = pathLength(wallOf(m, el.host.wallId).path);
  if (el.host.offset < -1e-6 || el.host.offset > len + 1e-6)
    fail('invalid', `Poloha ${Math.round(el.host.offset)} mm leží mimo stěnu (délka ${Math.round(len)} mm)`);
}

/** Sloty rámečku jen u typu ze znaků (zásuvky, spínače). */
export function checkSlots(t: ElectroType, slots: readonly string[] | null | undefined) {
  if (slots && t.symbol.kind !== 'glyphs') fail('invalid', `Typ „${t.name}“ nemá rámeček se sloty`);
}
