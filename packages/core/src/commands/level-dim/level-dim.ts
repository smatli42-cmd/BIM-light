// Příkazy výškové kóty v řezu (ČSN 01 3420; Revit Spot Elevation): vložení na úroveň podlaží nebo hranu
// prvku, posun praporku, úprava (nad / pod hranou, absolutní, vrstva, zámek), smazání. Undo jako vše.
import type { Id } from '../../ids/index.ts';
import type { LevelDimension, LevelRef } from '../../level-dim/types.ts';
import { levelZ } from '../../level-dim/value.ts';
import type { Model } from '../../model/types.ts';
import { omitIds } from '../../model/update.ts';
import { SECTION_LAYER } from '../../style/presets/defaults.ts';
import { S, type JsonSchema } from '../schema.ts';
import { defineCommand, fail } from '../types.ts';
import { sectionOf } from '../section/section.ts';

export const REF: JsonSchema = {
  oneOf: [
    S.object({ kind: { type: 'string', enum: ['storey'] }, storeyId: S.id }, ['kind', 'storeyId']),
    S.object(
      {
        kind: { type: 'string', enum: ['edge'] },
        elementId: S.id,
        edge: S.enumOf(['top', 'bottom'], 'hrana'),
      },
      ['kind', 'elementId', 'edge'],
    ),
  ],
  description:
    'na co kóta ukazuje: { kind: "storey", storeyId } = úroveň podlaží, { kind: "edge", elementId, edge: ' +
    '"top" | "bottom" } = horní / spodní hrana stěny nebo desky (dotaz levelDim.targets)',
};

export const levelDimOf = (m: Model, id: Id): LevelDimension =>
  m.levelDims[id] ?? fail('not-found', `Výšková kóta ${id} neexistuje`);

/** Výšková kóta v řezu nebo v půdorysu (mazání bere obě). */
export const anyLevelDimOf = (m: Model, id: Id): unknown =>
  m.levelDims[id] ?? m.planLevelDims[id] ?? fail('not-found', `Výšková kóta ${id} neexistuje`);
const put = (m: Model, d: LevelDimension): Model => ({ ...m, levelDims: { ...m.levelDims, [d.id]: d } });

function check(m: Model, d: LevelDimension): LevelDimension {
  sectionOf(m, d.sectionId);
  if (levelZ(m, d.ref) === null) fail('not-found', 'Kótovaná úroveň ani prvek neexistuje');
  if (m.display.layers[d.annotationLayerId]?.kind !== 'annotation')
    fail('not-found', 'Vrstva výškové kóty musí být skupina anotací');
  return d;
}

function unlocked(m: Model, id: Id): LevelDimension {
  const d = levelDimOf(m, id);
  if (d.locked) fail('lock-violation', 'Výšková kóta je zamčená');
  return d;
}

type Fields = { below?: boolean; absolute?: boolean; annotationLayerId?: Id };
const FIELDS: Record<string, JsonSchema> = {
  below: { type: 'boolean', description: 'praporek pod hranou (kóta spodní hrany)' },
  absolute: { type: 'boolean', description: 'absolutní kóta v m n. m. Bpv (plný trojúhelník)' },
  annotationLayerId: S.id,
};

export const levelDimCreate = defineCommand<Fields & { sectionId: Id; ref: LevelRef; at: number }>({
  name: 'levelDim.create',
  label: 'Výšková kóta',
  description:
    'Vloží výškovou kótu do řezu nebo pohledu (sectionId): ref = úroveň podlaží nebo hrana prvku, at = ' +
    'poloha praporku po výkrese řezu (mm od levého okraje, jako u v dotazu section.elements), below = ' +
    'praporek pod hranou, absolute = nadmořská výška Bpv. Hodnota se počítá z modelu (ČSN 01 3420).',
  group: 'Řezy a pohledy',
  icon: 'level-dim',
  params: S.object({ sectionId: S.id, ref: REF, at: S.number('mm po výkrese řezu'), ...FIELDS }, [
    'sectionId',
    'ref',
    'at',
  ]),
  run(model, p, ctx) {
    const d = check(model, {
      id: ctx.newId(),
      sectionId: p.sectionId,
      ref: p.ref,
      at: p.at,
      below: p.below ?? false,
      absolute: p.absolute ?? false,
      annotationLayerId: p.annotationLayerId ?? SECTION_LAYER.id,
      locked: false,
    });
    return { model: put(model, d), created: [d.id] };
  },
});

export const levelDimMove = defineCommand<{ levelDimId: Id; at: number; below?: boolean }>({
  name: 'levelDim.move',
  label: 'Posunout výškovou kótu',
  description: 'Posune praporek výškové kóty po výkrese (at v mm), below = nad / pod hranou. Zamčenou ne.',
  group: 'Řezy a pohledy',
  params: S.object({ levelDimId: S.id, at: S.number('mm po výkrese řezu'), below: FIELDS['below'] ?? {} }, [
    'levelDimId',
    'at',
  ]),
  run(model, p) {
    const d = unlocked(model, p.levelDimId);
    return { model: put(model, { ...d, at: p.at, below: p.below ?? d.below }) };
  },
});

export const levelDimUpdate = defineCommand<Fields & { levelDimId: Id; ref?: LevelRef; locked?: boolean }>({
  name: 'levelDim.update',
  label: 'Upravit výškovou kótu',
  description:
    'Změní výškovou kótu: ref (jiná hrana / úroveň), below, absolute, vrstvu, locked (zámek). Zamčenou jde ' +
    'jen odemknout.',
  group: 'Řezy a pohledy',
  params: S.object({ levelDimId: S.id, ref: REF, ...FIELDS, locked: { type: 'boolean' } }, ['levelDimId']),
  run(model, p) {
    const d = levelDimOf(model, p.levelDimId);
    const { levelDimId: _id, ...patch } = p;
    const onlyLock = Object.keys(patch).every((k) => k === 'locked');
    if (d.locked && !onlyLock) fail('lock-violation', 'Výšková kóta je zamčená');
    return { model: put(model, check(model, { ...d, ...patch })) };
  },
});

/** Smaže výškové kóty (i zamčené – zámek brání změně, ne smazání). */
export const removeLevelDims = (m: Model, ids: readonly Id[]): Model =>
  ids.length
    ? { ...m, levelDims: omitIds(m.levelDims, ids), planLevelDims: omitIds(m.planLevelDims, ids) }
    : m;

export const levelDimDelete = defineCommand<{ levelDimIds: Id[] }>({
  name: 'levelDim.delete',
  label: 'Smazat výškovou kótu',
  description: 'Smaže výškové kóty v řezech i v půdorysu (i zamčené – zámek brání jen posunu a změně).',
  group: 'Řezy a pohledy',
  params: S.object({ levelDimIds: { type: 'array', items: S.id, minItems: 1 } }, ['levelDimIds']),
  run(model, p) {
    p.levelDimIds.forEach((id) => anyLevelDimOf(model, id));
    return { model: removeLevelDims(model, p.levelDimIds) };
  },
});
