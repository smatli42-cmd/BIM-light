// Příkaz vlastností typu stěny (plán stěn Z7): funkce, nosná, vnější, požární odolnost, neprůzvučnost.
// Platí pro všechny stěny typu, které hodnotu nepřepisují.
import type { Id } from '../../ids/index.ts';
import { TYPE_PROPERTIES_SCHEMA } from '../../wall-props/params.ts';
import { typeProperties } from '../../wall-props/resolve.ts';
import type { WallProperties } from '../../wall-props/types.ts';
import { wallTypeOf } from '../lookup.ts';
import { S } from '../schema.ts';
import { defineCommand, fail } from '../types.ts';

export const wallTypeSetProperties = defineCommand<{ typeId: Id; properties: Partial<WallProperties> }>({
  name: 'wallType.setProperties',
  label: 'Vlastnosti typu',
  description:
    'Změní vlastnosti typu stěny (jen zadané): funkce (exterior obvodová / interior vnitřní / partition ' +
    'příčka / foundation základová / retaining opěrná), nosná, vnější, požární odolnost a neprůzvučnost ' +
    '(text). Platí pro všechny stěny typu, které hodnotu nepřepisují (wall.setProperties).',
  group: 'Typ stěny',
  params: S.object({ typeId: S.id, properties: TYPE_PROPERTIES_SCHEMA }, ['typeId', 'properties']),
  run(model, p) {
    const t = wallTypeOf(model, p.typeId);
    const next = { ...t, properties: { ...typeProperties(t), ...p.properties } };
    return { model: { ...model, wallTypes: { ...model.wallTypes, [t.id]: next } } };
  },
});

export const wallTypeSetMark = defineCommand<{ typeId: Id; mark: string }>({
  name: 'wallType.setMark',
  label: 'Značka typu',
  description:
    'Změní značku typu stěny (krátké označení skladby v půdorysu a v legendě skladeb, např. „S1“). ' +
    'Značka musí být v projektu jedinečná.',
  group: 'Typ stěny',
  params: S.object({ typeId: S.id, mark: { type: 'string', description: 'značka, např. S1' } }, [
    'typeId',
    'mark',
  ]),
  run(model, p) {
    const t = wallTypeOf(model, p.typeId);
    const mark = p.mark.trim();
    if (!mark) fail('invalid', 'Značka nesmí být prázdná');
    const clash = Object.values(model.wallTypes).find((x) => x.id !== t.id && x.mark === mark);
    if (clash) fail('invalid', `Značku ${mark} už má typ „${clash.name}“`);
    return { model: { ...model, wallTypes: { ...model.wallTypes, [t.id]: { ...t, mark } } } };
  },
});
