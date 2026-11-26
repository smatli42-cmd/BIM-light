// Dotaz: stěny stejné jako zadaná (plán stěn Z9; Revit „Vybrat všechny instance“, Archicad Najít
// a vybrat). Kritéria: typ, podlaží, stav; výsledek = id stěn pro výběr (výběr je věc rozhraní).
import { S } from '../commands/schema.ts';
import { wallOf } from '../commands/lookup.ts';
import type { Id } from '../ids/index.ts';
import { allWalls } from '../wall/queries.ts';
import { defineQuery } from './types.ts';

export const SAME_BY = ['type', 'storey', 'status'] as const;
export type SameBy = (typeof SAME_BY)[number];

export const wallFindSame = defineQuery<{ wallId: Id; by?: SameBy[] }, Id[]>({
  name: 'wall.findSame',
  label: 'Najít stejné stěny',
  description:
    'Id všech stěn (včetně zadané), které se zadanou stěnou shodují ve všech kritériích „by“: type (typ), ' +
    'storey (podlaží), status (stav). Výchozí: typ a podlaží (jako „Vybrat vše v pohledu“ v Revitu).',
  group: 'Stěna',
  params: S.object(
    { wallId: S.id, by: { type: 'array', items: S.enumOf(SAME_BY, 'kritérium'), minItems: 1 } },
    ['wallId'],
  ),
  run(m, p) {
    const w = wallOf(m, p.wallId);
    const by = new Set(p.by ?? ['type', 'storey']);
    return allWalls(m)
      .filter(
        (x) =>
          (!by.has('type') || x.typeId === w.typeId) &&
          (!by.has('storey') || x.storeyId === w.storeyId) &&
          (!by.has('status') || x.status === w.status),
      )
      .map((x) => x.id);
  },
});
