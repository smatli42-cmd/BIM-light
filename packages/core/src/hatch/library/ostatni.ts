// Knihovna šraf, skupina ostatní (obecné, sendviče, kámen, povrchy, plasty, bourané, krytina).
// Vzhled podle ČSN 01 3420. Rozměry v mm na papíře.
import { entry, lines, marks, motif, type Hatch } from '../types.ts';
import { plus, ring, seg } from './shapes.ts';

const h = entry('ostatni');
const PASY = lines(90, 3.2);

/** Drobné tečky a trojúhelníčky ze tří rastrů s nesoudělnými roztečemi (vypadá náhodně). */
const scatter = (k: number) => [
  marks('dot', 0.3, 2.2 * k, 1.9 * k, 1.1 * k),
  marks('dot', 0.25, 3.1 * k, 2.7 * k, 0.7 * k, 17),
  marks('triangle', 0.6, 5.3 * k, 4.1 * k, 2.9 * k, 23),
];

export const OSTATNI: readonly Hatch[] = [
  h(1, 'hatch.bez-srafy', 'bez šrafy'),
  h(2, 'hatch.obecne', 'Obecné (bez rozlišení hmot)', {
    families: [lines(45, 4.8), lines(45, 4.8, [3.2, 1.6], 0, 2.4)],
  }),
  h(21, 'hatch.sendvic', 'Sendvičové konstrukce', { families: [lines(90, 2.4)] }),
  h(22, 'hatch.sendvic-krizky', 'Sendvič – křížky', {
    variantOf: 'hatch.sendvic',
    families: [PASY, motif([seg(-0.6, 0, 0.6, 0)], 3.2, 2.4)],
  }),
  h(23, 'hatch.sendvic-krouzky', 'Sendvič – kroužky', {
    variantOf: 'hatch.sendvic',
    families: [PASY, motif([ring(0, 0, 0.5)], 3.2, 2.4)],
  }),
  h(31, 'hatch.kamen', 'Kámen (kromě zdiva)', { families: [lines(60, 1.0, [0.9, 0.7], 0.8)] }),
  h(35, 'hatch.omitky', 'Omítky, sádra, stěrky', { families: scatter(1) }),
  h(36, 'hatch.sadrokarton', 'Sádrokarton', { families: scatter(1.7) }),
  h(37, 'hatch.anhydrit', 'Anhydrit (potěr)', {
    families: [marks('dot', 0.3, 3.0, 2.6, 1.5), marks('dot', 0.25, 4.3, 3.7, 1.1, 21)],
  }),
  h(38, 'hatch.plasty', 'Plasty, pryž, pružný tmel', { families: [lines(45, 4.0), lines(135, 4.0)] }),
  h(39, 'hatch.bourane', 'Bourané konstrukce', { families: [motif(plus(0, 0, 0.6), 3.2, 3.2)] }),
  h(40, 'hatch.krytina', 'Krytina', { families: [lines(0, 1.9)] }),
];
