// Dotaz pro AI (základ 11, plán stěn Z6): výsledná grafika prvku v pohledu a „proč“ – které patro
// a které pravidlo rozhodlo o každé vlastnosti. Stejná data ukazuje panel stěny.
import { S } from '../commands/schema.ts';
import { fail } from '../commands/types.ts';
import { openingFacts } from '../opening/draw.ts';
import { elementFacts } from '../style/conditions.ts';
import { resolveGraphics } from '../style/graphics.ts';
import { defineQuery } from './types.ts';

export const elementGraphics = defineQuery<{ elementId: string; viewId: string }, unknown>({
  name: 'element.graphics',
  label: 'Grafika prvku a proč',
  description:
    'Výsledná grafika stěny nebo otvoru v pohledu (viditelnost, pera, barva a typ čáry, výplň, šrafa, ' +
    'konce stěn, značka osy) a ke každé vlastnosti důvod: patro 1–6 (materiál a kategorie, styl, ' +
    'pravidla, úprava pohledu, přepis prvku, přepis v pohledu) a název pravidla nebo stylu.',
  group: 'Zobrazení',
  params: S.object({ elementId: S.id, viewId: S.id }, ['elementId', 'viewId']),
  run(m, p) {
    const view = m.views[p.viewId] ?? fail('not-found', `Pohled ${p.viewId} neexistuje`);
    const el = m.elements[p.elementId];
    const op = m.openings[p.elementId];
    const facts = el ? elementFacts(m, el) : op ? openingFacts(op) : null;
    if (!facts) return fail('not-found', `Prvek ${p.elementId} neexistuje`);
    return resolveGraphics(m.display, view, facts);
  },
});
