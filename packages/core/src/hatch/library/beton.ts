// Knihovna šraf, skupina beton. Vzhled je návrh podle názvu (k porovnání s arditem).
import { entry, lines, marks, type Hatch } from '../types.ts';

const h = entry('beton');
const PROSTY = [marks('dot', 0.25, 1.4, 1.2), marks('triangle', 0.6, 3.2, 2.8, 1.6, 15)];

export const BETON: readonly Hatch[] = [
  h(9, 'hatch.beton-vyztuzeny', 'Beton vyztužený (železobeton)', { families: [...PROSTY, lines(45, 2.5)] }),
  h(10, 'hatch.beton-prosty', 'Beton nevyztužený (prostý)', { families: PROSTY }),
  h(11, 'hatch.beton-krouzky', 'Beton – kroužky', {
    variantOf: 'hatch.beton-prosty',
    families: [marks('dot', 0.25, 1.4, 1.2), marks('circle', 0.8, 3.2, 2.8)],
  }),
  h(12, 'hatch.beton-trojuhelniky', 'Beton – trojúhelníky', {
    variantOf: 'hatch.beton-prosty',
    families: [marks('triangle', 0.6, 2, 1.8, 1, 15)],
  }),
  h(13, 'hatch.beton-carkovana-krouzky', 'Beton – čárkovaná s kroužky', {
    variantOf: 'hatch.beton-prosty',
    families: [lines(45, 2.5, [1.5, 1]), marks('circle', 0.8, 3.2, 2.8)],
  }),
];
