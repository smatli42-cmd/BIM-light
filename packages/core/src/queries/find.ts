// Dotaz pro AI: Najít a vybrat (koncepce rozhraní, část 2 B) – prvky podle kritérií, stejně jako panel
// s lupou v rozhraní.
import { S, type JsonSchema } from '../commands/schema.ts';
import { findElements, type FindCriteria } from '../selection/find.ts';
import { defineQuery } from './types.ts';

const RANGE: JsonSchema = S.object({ min: S.number('mm (od)'), max: S.number('mm (do)') }, []);

export const elementFind = defineQuery<FindCriteria, unknown>({
  name: 'element.find',
  label: 'Najít prvky',
  description:
    'Najde prvky podle kritérií (všechna zadaná musí platit): druh (wall / opening / dimension), podlaží, ' +
    'typ stěny, materiál ve skladbě, část GlobalId, část názvu typu, oblouková stěna, tloušťka, výška ' +
    'prvku a šířka otvoru (rozsahy v mm). Vrátí id stěn, otvorů a kót.',
  group: 'Výběr',
  params: S.object(
    {
      categories: {
        type: 'array',
        items: S.enumOf(['wall', 'opening', 'dimension'], 'druh prvku'),
      } as JsonSchema,
      storeyIds: { type: 'array', items: S.id } as JsonSchema,
      wallTypeId: S.id,
      materialId: S.id,
      idContains: { type: 'string' },
      nameContains: { type: 'string' },
      curved: { type: 'boolean' },
      thickness: RANGE,
      height: RANGE,
      openingWidth: RANGE,
    },
    [],
  ),
  run: (m, p) => findElements(m, p),
});
