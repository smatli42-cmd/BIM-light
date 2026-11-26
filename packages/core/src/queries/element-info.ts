// Dotaz pro AI: karta prvku – stejný souhrn, jaký rozhraní ukáže po podržení myši nad prvkem.
import { S } from '../commands/schema.ts';
import { fail } from '../commands/types.ts';
import { elementInfo, type ElementInfo } from '../selection/element-info.ts';
import { defineQuery } from './types.ts';

export const elementInfoQuery = defineQuery<{ elementId: string }, ElementInfo>({
  name: 'element.info',
  label: 'Karta prvku',
  description:
    'Souhrn vlastností stěny nebo otvoru (jako karta po podržení myši): u stěny podlaží, typ (skladba), ' +
    'délka referenčního líce, tloušťka, výška (mm), plocha boku a čistá plocha bez průchozích otvorů (m²), ' +
    'počet otvorů a modelová vrstva; u otvoru druh, šířka, výška, parapet, spodní hrana nad ±0 (mm), ' +
    'typ hostitelské stěny a vrstva.',
  group: 'Výběr',
  params: S.object({ elementId: S.id }, ['elementId']),
  run(m, p) {
    const info = elementInfo(m, p.elementId);
    if (!info) fail('not-found', `Prvek ${p.elementId} neexistuje.`);
    return info;
  },
});
