// Knihovna šraf, skupina izolace. Vzhled je návrh podle názvu (k porovnání s arditem).
import { entry, lines, marks, wave, type Hatch } from '../types.ts';

const h = entry('izolace');

export const IZOLACE: readonly Hatch[] = [
  h(24, 'hatch.tepelna-izolace', 'Tepelná izolace', { families: [wave('zigzag', 0.9, 2, 2)] }),
  h(25, 'hatch.izolace-obecna', 'Izolace obecná', { families: [lines(60, 1.6), lines(120, 1.6)] }),
  h(26, 'hatch.akusticka-izolace', 'Akustická izolace', { families: [wave('sine', 0.8, 2.4, 1.8)] }),
  h(27, 'hatch.izolace-plastve', 'Izolace – plástve', {
    variantOf: 'hatch.tepelna-izolace',
    families: [marks('hexagon', 1.2, 2.1, 1.8, 1.05)],
  }),
  h(28, 'hatch.izolace-trojuhelniky', 'Izolace – trojúhelníky', {
    variantOf: 'hatch.tepelna-izolace',
    families: [marks('triangle', 0.9, 1.8, 1.6)],
  }),
  h(29, 'hatch.izolace-krouzky', 'Izolace – kroužky', {
    variantOf: 'hatch.tepelna-izolace',
    families: [marks('circle', 0.9, 1.8, 1.6)],
  }),
  h(30, 'hatch.izolace-voda', 'Izolace proti vodě (vyčerněná)', { solid: true }),
];
