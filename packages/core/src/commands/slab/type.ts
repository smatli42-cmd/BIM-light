// Příkazy: typy desek (D1) – kopie, úpravy (název, značka, skladba, nosná, funkce), smazání.
// Skladba typu desky je sdílená položka projektu (koncepce rozhraní 11a); musí být „pro desku“.
import type { Id } from '../../ids/index.ts';
import type { Model } from '../../model/types.ts';
import { slabTypeUsage } from '../../slab/queries.ts';
import { SLAB_FUNCTIONS, type SlabFunction, type SlabType } from '../../slab/types.ts';
import { S } from '../schema.ts';
import { defineCommand, fail } from '../types.ts';
import { slabTypeOf } from './shared.ts';

const put = (m: Model, t: SlabType): Model => ({ ...m, slabTypes: { ...m.slabTypes, [t.id]: t } });

function checkComposition(m: Model, id: Id) {
  const c = m.compositions[id] ?? fail('not-found', `Skladba ${id} neexistuje`);
  if (!c.use.slab) fail('invalid', `Skladba „${c.name}“ není určená pro desku`);
}

export const slabTypeDuplicate = defineCommand<{ typeId: Id; name?: string }>({
  name: 'slabType.duplicate',
  label: 'Duplikovat typ desky',
  description:
    'Vytvoří kopii typu desky (sdílí stejnou skladbu, dokud ji nezměníš). Kopie nemá odkaz na knihovnu.',
  group: 'Typ desky',
  params: S.object({ typeId: S.id, name: { type: 'string' } }, ['typeId']),
  run(model, p, ctx) {
    const { source: _s, ...t } = slabTypeOf(model, p.typeId);
    const copy: SlabType = { ...t, id: ctx.newId(), name: p.name ?? `${t.name} – kopie` };
    return { model: put(model, copy), created: [copy.id] };
  },
});

export interface SlabTypeUpdateParams {
  typeId: Id;
  name?: string;
  mark?: string;
  compositionId?: Id;
  loadBearing?: boolean;
  slabFunction?: SlabFunction;
}

export const slabTypeUpdate = defineCommand<SlabTypeUpdateParams>({
  name: 'slabType.update',
  label: 'Upravit typ desky',
  description:
    'Změní typ desky: název, značku (např. D1, P1), skladbu (compositionId, musí být „pro desku“; ' +
    'změní tloušťku všech desek typu), nosná, výchozí funkci nových desek.',
  group: 'Typ desky',
  params: S.object(
    {
      typeId: S.id,
      name: { type: 'string' },
      mark: { type: 'string' },
      compositionId: S.id,
      loadBearing: { type: 'boolean' },
      slabFunction: S.enumOf(SLAB_FUNCTIONS, 'výchozí funkce'),
    },
    ['typeId'],
  ),
  run(model, { typeId, ...p }) {
    const t = slabTypeOf(model, typeId);
    if (p.name !== undefined && !p.name.trim()) fail('invalid', 'Název typu nesmí být prázdný');
    if (p.compositionId) checkComposition(model, p.compositionId);
    return { model: put(model, { ...t, ...p }) };
  },
});

export const slabTypeDelete = defineCommand<{ typeId: Id }>({
  name: 'slabType.delete',
  label: 'Smazat typ desky',
  description: 'Smaže typ desky, který žádná deska nepoužívá (skladba zůstane v projektu).',
  group: 'Typ desky',
  params: S.object({ typeId: S.id }, ['typeId']),
  run(model, p) {
    const t = slabTypeOf(model, p.typeId);
    const n = slabTypeUsage(model, t.id);
    if (n) fail('invalid', `Typ „${t.name}“ používá ${n} desek`);
    const { [t.id]: _gone, ...slabTypes } = model.slabTypes;
    return { model: { ...model, slabTypes } };
  },
});
