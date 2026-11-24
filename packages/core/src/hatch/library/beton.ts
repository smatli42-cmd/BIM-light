// Knihovna šraf, skupina beton. Vzhled podle ČSN 01 3420: šikmé čáry 45° střídavě plné a čerchované,
// odvozené s kroužky nebo trojúhelníčky mezi čarami. Rozměry v mm na papíře.
import { entry, lines, motif, type Hatch } from '../types.ts';
import { ring, tri } from './shapes.ts';

const h = entry('beton');
const S = 4.8;
const FULL = lines(45, S);

export const BETON: readonly Hatch[] = [
  h(9, 'hatch.beton-vyztuzeny', 'Beton vyztužený (železobeton)', {
    families: [FULL, lines(45, S, [3.2, 0.8, 0.3, 0.8], 0, S / 2)],
  }),
  h(10, 'hatch.beton-prosty', 'Beton nevyztužený (prostý)', {
    families: [FULL, lines(45, S, [6.4, 1.2, 0.3, 1.2], 0, S / 2)],
  }),
  h(11, 'hatch.beton-krouzky', 'Beton – kroužky', {
    variantOf: 'hatch.beton-prosty',
    families: [FULL, motif([ring(0, S / 2, 0.55)], 3.6, S, 0, 45)],
  }),
  h(12, 'hatch.beton-trojuhelniky', 'Beton – trojúhelníky', {
    variantOf: 'hatch.beton-prosty',
    families: [FULL, motif([tri(0, S / 2, 0.75)], 3.6, S, 0, 45)],
  }),
  h(13, 'hatch.beton-carkovana-krouzky', 'Beton – čárkovaná s kroužky', {
    variantOf: 'hatch.beton-prosty',
    families: [lines(45, S, [2.4, 1.2]), motif([ring(0, S / 2, 0.55)], 3.6, S, 1.8, 45)],
  }),
];
