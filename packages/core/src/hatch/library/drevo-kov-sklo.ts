// Knihovna šraf, skupina dřevo, kov a sklo. Vzhled podle ČSN 01 3420. Rozměry v mm na papíře.
import { entry, lines, motif, polyline, type Hatch } from '../types.ts';
import { seg } from './shapes.ts';

const h = entry('drevo-kov-sklo');

/** Zalomená čára „<“ (dřevo); řady „<<<“ ve dvou vrstvách nad sebou. */
const CHEVRON = polyline([0.9, 1.6], [-0.9, 0], [0.9, -1.6]);
/** Dvojitá krátká šikmá čárka (sklo). */
const DOUBLE = [seg(-0.9, -0.8, 0.1, 0.8), seg(-0.3, -0.8, 0.7, 0.8)];
/** Pás ze tří rovnoběžných čar (ploché sklo). */
const BAND = [0, 0.6, 1.2].map((shift) => lines(60, 9.6, [], 0, shift));

export const DREVO_KOV_SKLO: readonly Hatch[] = [
  h(20, 'hatch.drevo', 'Dřevo', { families: [motif([CHEVRON], 2.4, 4.0)] }),
  h(32, 'hatch.kovy', 'Kovy', { families: [lines(45, 1.1)] }),
  h(33, 'hatch.sklo', 'Sklo', { families: [motif(DOUBLE, 5.6, 4.8, 2.8)] }),
  h(34, 'hatch.ploche-sklo', 'Ploché sklo', { families: BAND }),
];
