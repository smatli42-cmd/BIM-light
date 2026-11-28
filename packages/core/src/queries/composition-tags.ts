// Dotaz na popisy skladby v řezech: AI vidí totéž co výkres – bod uchycení, polohu textu a řádky vrstev
// spočítané z typu prvku (po změně skladby nové).
import { S } from '../commands/schema.ts';
import { tagLayout } from '../composition-tag/content.ts';
import { defineQuery } from './types.ts';

export const compositionTagList = defineQuery<{ sectionId?: string }, unknown>({
  name: 'compositionTag.list',
  label: 'Popisy skladby v řezu',
  description:
    'Popisy skladby v řezech (volitelně jen sectionId): id, řez, prvek, volby (numbered, thickness, title, ' +
    'reverse), anchorAt = bod uchycení a textAt = začátek poličky na výkrese (mm), lines = řádky textu, ' +
    'layers = vrstvy (materiál, tloušťka) v pořadí popisu; null = prvek už rovina řezu neprotíná.',
  group: 'Řezy a pohledy',
  params: S.object({ sectionId: S.id }, []),
  run: (m, p) =>
    Object.values(m.compositionTags)
      .filter((t) => !p.sectionId || t.sectionId === p.sectionId)
      .map((t) => {
        const s = m.sections[t.sectionId];
        const l = s ? tagLayout(m, s, t) : null;
        return {
          ...t,
          anchorAt: l?.anchor ?? null,
          textAt: l?.textAt ?? null,
          lines: l?.lines ?? null,
          layers: l?.layers ?? null,
        };
      }),
});
