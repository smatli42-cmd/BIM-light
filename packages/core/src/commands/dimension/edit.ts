// Příkazy nad kótou: zámek, smazání, poloha čáry, přepis textu, skupina zarovnání
// (pravidla-interakce: kóty 1, 4, 6, 10, 12).
import type { Id } from '../../ids/index.ts';
import type { Model } from '../../model/types.ts';
import { putDimensions, removeDimensions } from '../../model/update.ts';
import { measureDimension } from '../../dimension/measure.ts';
import type { Dimension } from '../../dimension/types.ts';
import { dimensionOf } from '../lookup.ts';
import { S, type JsonSchema } from '../schema.ts';
import { defineCommand } from '../types.ts';

const IDS = { type: 'array', items: S.id, minItems: 1 } as JsonSchema;

const updateAll = (model: Model, ids: Id[], fn: (d: Dimension) => Dimension) =>
  putDimensions(
    model,
    ids.map((id) => fn(dimensionOf(model, id))),
  );

export const dimensionSetLocked = defineCommand<{ dimensionId: Id; locked: boolean }>({
  name: 'dimension.setLocked',
  label: 'Zamknout / odemknout kótu',
  description: 'Zamkne kótu na její aktuální hodnotě, nebo ji odemkne. Zámek se jinak nikdy sám nemění.',
  group: 'Kóta',
  params: S.object({ dimensionId: S.id, locked: { type: 'boolean' } }, ['dimensionId', 'locked']),
  run(model, p) {
    const d = dimensionOf(model, p.dimensionId);
    const value = p.locked ? measureDimension(model, d) : d.value;
    return { model: putDimensions(model, [{ ...d, locked: p.locked, value }]) };
  },
});

export const dimensionDelete = defineCommand<{ dimensionIds: Id[] }>({
  name: 'dimension.delete',
  label: 'Smazat kótu',
  description: 'Smaže kóty podle id (i více najednou); stěny zůstanou beze změny.',
  group: 'Kóta',
  params: S.object({ dimensionIds: IDS }, ['dimensionIds']),
  run(model, p) {
    p.dimensionIds.forEach((id) => dimensionOf(model, id));
    return { model: removeDimensions(model, p.dimensionIds) };
  },
});

export const dimensionSetOffset = defineCommand<{ dimensionIds: Id[]; offset: number }>({
  name: 'dimension.setOffset',
  label: 'Posunout kótovací čáru',
  description: 'Nastaví polohu kótovací čáry (odsazení od měřeného místa, mm). Měřené prvky se nehýbou.',
  group: 'Kóta',
  params: S.object({ dimensionIds: IDS, offset: S.number('mm') }, ['dimensionIds', 'offset']),
  run: (model, p) => ({
    model: updateAll(model, p.dimensionIds, (d) =>
      d.kind === 'angular' ? { ...d, radius: Math.abs(p.offset) } : { ...d, offset: p.offset },
    ),
  }),
});

export const dimensionSetText = defineCommand<{ dimensionId: Id; text: string | null }>({
  name: 'dimension.setText',
  label: 'Přepsat text kóty',
  description: 'Přepíše text kóty; null vrátí skutečnou hodnotu.',
  group: 'Kóta',
  params: S.object({ dimensionId: S.id, text: { oneOf: [{ type: 'string' }, { type: 'null' }] } }, [
    'dimensionId',
    'text',
  ]),
  run: (model, p) => ({ model: updateAll(model, [p.dimensionId], (d) => ({ ...d, textOverride: p.text })) }),
});

export const dimensionSetTextShift = defineCommand<{ dimensionIds: Id[]; shift: number }>({
  name: 'dimension.setTextShift',
  label: 'Posunout číslo kóty',
  description:
    'Posune číslo kót po kótovací čáře o shift mm od středu (+ ve směru čáry, 0 = zpět doprostřed). Číslo ' +
    'mimo kótu (krátké kóty) leží na prodloužené kótovací čáře.',
  group: 'Kóta',
  params: S.object({ dimensionIds: IDS, shift: S.number('mm od středu kóty po kótovací čáře') }, [
    'dimensionIds',
    'shift',
  ]),
  run: (model, p) => ({
    model: updateAll(model, p.dimensionIds, (d) => {
      const { textShift: _old, ...rest } = d;
      return Math.abs(p.shift) < 1e-6 ? rest : { ...rest, textShift: p.shift };
    }),
  }),
});

export const dimensionSetAlignGroup = defineCommand<{ dimensionIds: Id[]; groupId: Id | null }>({
  name: 'dimension.setAlignGroup',
  label: 'Skupina zarovnání',
  description: 'Zařadí kóty do skupiny zarovnání (hýbou se spolu), nebo je ze skupiny vyjme (null).',
  group: 'Kóta',
  params: S.object({ dimensionIds: IDS, groupId: { oneOf: [S.id, { type: 'null' }] } }, [
    'dimensionIds',
    'groupId',
  ]),
  run: (model, p) => ({
    model: updateAll(model, p.dimensionIds, (d) => ({ ...d, alignGroupId: p.groupId })),
  }),
});
