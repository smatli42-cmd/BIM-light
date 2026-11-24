// Knihovna šraf, skupina zdivo a dílce. Vzhled podle ČSN 01 3420: mřížka 45° + 135° a šikmé čáry.
// Rozměry v mm na papíře.
import { entry, lines, type Hatch } from '../types.ts';

const h = entry('zdivo');

export const ZDIVO: readonly Hatch[] = [
  h(14, 'hatch.zdivo', 'Zdivo', { families: [lines(45, 2.4), lines(135, 4.8)] }),
  h(15, 'hatch.zdivo-mrizka', 'Zdivo – mřížka', { families: [lines(45, 3.2), lines(135, 3.2)] }),
  h(16, 'hatch.zdivo-carkovana', 'Zdivo – čárkovaná', {
    variantOf: 'hatch.zdivo',
    families: [lines(45, 3.2, [2.4, 1.2])],
  }),
  h(17, 'hatch.zdivo-husta-mrizka', 'Zdivo – hustá mřížka', {
    families: [lines(45, 1.6), lines(135, 1.6)],
  }),
  h(18, 'hatch.zdivo-svislice-sikme', 'Zdivo – svislice a šikmé', {
    variantOf: 'hatch.zdivo',
    families: [lines(90, 3.2), lines(45, 3.2)],
  }),
  h(19, 'hatch.dilce', 'Dílce (prefabrikáty)', { families: [lines(90, 6.4)] }),
];
