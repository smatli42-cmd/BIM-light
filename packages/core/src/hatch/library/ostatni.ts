// Knihovna šraf, skupina ostatní (obecné, sendviče, kámen, povrchy, plasty, bourané, krytina).
// Vzhled je návrh podle názvu (k porovnání s arditem).
import { entry, lines, marks, type Hatch } from '../types.ts';

const h = entry('ostatni');
const PLNA = [lines(0, 2.5)];

export const OSTATNI: readonly Hatch[] = [
  h(1, 'hatch.bez-srafy', 'bez šrafy'),
  h(2, 'hatch.obecne', 'Obecné (bez rozlišení hmot)', { families: [lines(45, 3)] }),
  h(21, 'hatch.sendvic', 'Sendvičové konstrukce', { families: [...PLNA, lines(45, 2.5)] }),
  h(22, 'hatch.sendvic-krizky', 'Sendvič – křížky', {
    variantOf: 'hatch.sendvic',
    families: [...PLNA, marks('cross', 0.8, 2.5)],
  }),
  h(23, 'hatch.sendvic-krouzky', 'Sendvič – kroužky', {
    variantOf: 'hatch.sendvic',
    families: [...PLNA, marks('circle', 0.8, 2.5)],
  }),
  h(31, 'hatch.kamen', 'Kámen (kromě zdiva)', { families: [lines(30, 2.5), lines(120, 3.5, [2, 1.5])] }),
  h(35, 'hatch.omitky', 'Omítky, sádra, stěrky', { families: [marks('dot', 0.2, 0.8)] }),
  h(36, 'hatch.sadrokarton', 'Sádrokarton', { families: [lines(45, 1, [0.3, 0.7])] }),
  h(37, 'hatch.anhydrit', 'Anhydrit (potěr)', {
    families: [marks('triangle', 0.4, 1.2, 1), marks('dot', 0.2, 1.2, 1, 0)],
  }),
  h(38, 'hatch.plasty', 'Plasty, pryž, pružný tmel', {
    families: [lines(45, 1.2), lines(135, 2.4, [0.6, 0.6])],
  }),
  h(39, 'hatch.bourane', 'Bourané konstrukce', {
    families: [lines(45, 2.5, [1.5, 1]), lines(135, 2.5, [1.5, 1])],
  }),
  h(40, 'hatch.krytina', 'Krytina', { families: [lines(0, 1.2)] }),
];
