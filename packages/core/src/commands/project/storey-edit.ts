// Úprava a smazání podlaží (základ 12, plán stěn Z3). Podlaží jsou naskládaná na sebe jako v Archicadu:
// změna konstrukční výšky posune všechna podlaží nad ním, změna úrovně posune podlaží i ta nad ním
// a podlaží pod ním změní výšku. Výšky prvků se počítají z podlaží, takže se přepočítají samy.
import type { Id } from '../../ids/index.ts';
import { storeyStack } from '../../model/storeys.ts';
import type { Model, Storey } from '../../model/types.ts';
import { omitIds } from '../../model/update.ts';
import { allWalls } from '../../wall/queries.ts';
import { storeyOf } from '../lookup.ts';
import { S } from '../schema.ts';
import { defineCommand, fail } from '../types.ts';

const EPS = 0.001;

/** Nová podlaží budovy po změně úrovně nebo výšky jednoho z nich. */
function restack(model: Model, s: Storey, elevation: number, height: number): Storey[] {
  const { stack, index } = storeyStack(model, s.id);
  const dElev = elevation - s.elevation;
  const shiftAbove = dElev + (height - s.height);
  const below = stack[index - 1];
  if (below && !(elevation > below.elevation)) fail('invalid', `Úroveň musí být nad podlažím ${below.name}`);
  const out: Storey[] = [{ ...s, elevation, height }];
  for (const above of stack.slice(index + 1)) out.push({ ...above, elevation: above.elevation + shiftAbove });
  if (below && dElev !== 0 && Math.abs(below.elevation + below.height - s.elevation) < EPS) {
    out.push({ ...below, height: below.height + dElev });
  }
  return out;
}

export const storeyUpdate = defineCommand<{
  storeyId: Id;
  name?: string;
  elevation?: number;
  height?: number;
}>({
  name: 'storey.update',
  label: 'Upravit podlaží',
  description:
    'Změní název, úroveň (mm nad ±0,000) nebo konstrukční výšku podlaží. Podlaží nad ním se posunou ' +
    '(jako Archicad); výšky stěn vázaných na podlaží se přepočítají samy.',
  group: 'Projekt',
  params: S.object(
    {
      storeyId: S.id,
      name: { type: 'string' },
      elevation: S.number('mm'),
      height: S.number('mm', { exclusiveMinimum: 0 }),
    },
    ['storeyId'],
  ),
  run(model, p) {
    const s = storeyOf(model, p.storeyId);
    const named = { ...s, name: p.name ?? s.name };
    const changed = restack(model, named, p.elevation ?? s.elevation, p.height ?? s.height);
    const storeys = { ...model.storeys };
    for (const st of changed) storeys[st.id] = st;
    return { model: { ...model, storeys } };
  },
});

/** Prvky, které na podlaží leží nebo jsou k němu vázané vrškem (stěna přes více podlaží). */
export function storeyDependents(model: Model, storeyId: Id): { elements: number; dimensions: number } {
  const { stack, index } = storeyStack(model, storeyId);
  const ids = new Set(stack.map((s) => s.id));
  let elements = 0;
  for (const w of allWalls(model)) {
    if (w.storeyId === storeyId || w.height.baseStoreyId === storeyId) elements++;
    else if (w.height.top.kind === 'storey' && ids.has(w.height.baseStoreyId)) {
      const base = stack.findIndex((s) => s.id === w.height.baseStoreyId);
      if (base < index && base + w.height.top.storeys >= index) elements++;
    }
  }
  const dimensions = Object.values(model.dimensions).filter((d) => d.storeyId === storeyId).length;
  return { elements, dimensions };
}

export const storeyDelete = defineCommand<{ storeyId: Id }>({
  name: 'storey.delete',
  label: 'Smazat podlaží',
  description:
    'Smaže prázdné podlaží i s jeho pohledy. Leží-li na něm prvky nebo kóty (nebo jím prochází stěna ' +
    'vázaná vrškem), příkaz se odmítne a řekne kolik jich je. Poslední podlaží smazat nejde.',
  group: 'Projekt',
  params: S.object({ storeyId: S.id }, ['storeyId']),
  run(model, p) {
    const s = storeyOf(model, p.storeyId);
    if (Object.keys(model.storeys).length <= 1) fail('invalid', 'Projekt musí mít aspoň jedno podlaží');
    const dep = storeyDependents(model, s.id);
    if (dep.elements + dep.dimensions > 0) {
      fail(
        'invalid',
        `Na podlaží ${s.name} je ${dep.elements} prvků a ${dep.dimensions} kót; nejdřív je smažte nebo přesuňte`,
      );
    }
    const views = Object.values(model.views)
      .filter((v) => v.storeyId === s.id)
      .map((v) => v.id);
    return {
      model: { ...model, storeys: omitIds(model.storeys, [s.id]), views: omitIds(model.views, views) },
    };
  },
});
