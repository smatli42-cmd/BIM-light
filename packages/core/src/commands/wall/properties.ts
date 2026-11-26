// Příkazy: strana tloušťky, typ, stav, profese a přepisy vlastností stěny (výška je v height.ts).
import type { Id } from '../../ids/index.ts';
import { STATUSES, type Status } from '../../model/types.ts';
import { putElements } from '../../model/update.ts';
import type { Wall } from '../../wall/types.ts';
import { wallOf, wallTypeOf } from '../lookup.ts';
import { S } from '../schema.ts';
import { defineCommand } from '../types.ts';
import { WALL_IDS } from './shared.ts';
import { normalizeRefLines } from '../wall-type/shared.ts';
import { INSTANCE_PROPERTIES_SCHEMA } from '../../wall-props/params.ts';
import { applyOverrides } from '../../wall-props/resolve.ts';
import type { WallProperties } from '../../wall-props/types.ts';

/** Přepisy vlastností: hodnota, nebo null = podle typu. */
type PropertyChange = { [K in keyof WallProperties]?: WallProperties[K] | null };

const update = (ids: Id[], model: Parameters<typeof wallOf>[0], fn: (w: Wall) => Wall) =>
  putElements(
    model,
    ids.map((id) => fn(wallOf(model, id))),
  );

export const wallFlipSide = defineCommand<{ wallIds: Id[] }>({
  name: 'wall.flipSide',
  label: 'Přehodit stranu',
  description: 'Přehodí stranu tloušťky (mezerník). Referenční čára zůstane na místě.',
  group: 'Stěna',
  shortcut: 'Space',
  params: S.object({ wallIds: WALL_IDS }, ['wallIds']),
  run: (model, p) => ({
    model: update(p.wallIds, model, (w) => ({ ...w, side: w.side === 'left' ? 'right' : 'left' })),
  }),
});

export const wallSetType = defineCommand<{ wallIds: Id[]; typeId: Id }>({
  name: 'wall.setType',
  label: 'Změnit typ',
  description:
    'Přiřadí stěnám jiný typ. Referenční čára zůstane na místě (u typu bez jádra se „líc jádra“ změní na „líc“).',
  group: 'Stěna',
  params: S.object({ wallIds: WALL_IDS, typeId: S.id }, ['wallIds', 'typeId']),
  run(model, p) {
    wallTypeOf(model, p.typeId);
    return { model: normalizeRefLines(update(p.wallIds, model, (w) => ({ ...w, typeId: p.typeId }))) };
  },
});

interface SetPropertiesParams {
  wallIds: Id[];
  status?: Status;
  discipline?: string;
  properties?: PropertyChange;
}

export const wallSetProperties = defineCommand<SetPropertiesParams>({
  name: 'wall.setProperties',
  label: 'Vlastnosti stěny',
  description:
    'Změní stav (stávající / bourání / nový), profesi nebo vlastnosti stěn. „properties“ přepíše ' +
    'vlastnosti typu jen u těchto stěn (funkce, nosná, vnější, požární odolnost, neprůzvučnost); ' +
    'null vrátí hodnotu podle typu.',
  group: 'Stěna',
  params: S.object(
    {
      wallIds: WALL_IDS,
      status: S.enumOf(STATUSES, 'stav'),
      discipline: { type: 'string' },
      properties: INSTANCE_PROPERTIES_SCHEMA,
    },
    ['wallIds'],
  ),
  run: (model, p) => ({
    model: update(p.wallIds, model, (w) =>
      applyOverrides(
        { ...w, status: p.status ?? w.status, discipline: p.discipline ?? w.discipline },
        p.properties ?? {},
      ),
    ),
  }),
});
