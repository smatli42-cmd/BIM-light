// Knihovna šraf, skupina zdivo a dílce. Vzhled podle ČSN 01 3420: mřížka 45° + 135° a šikmé čáry.
// Rozměry v mm na papíře.
import { entry, lines, type Hatch } from '../types.ts';

const h = entry('zdivo');

export const ZDIVO: readonly Hatch[] = [
  h(14, 'hatch.zdivo', 'Zdivo', { families: [lines(45, 2.0), lines(135, 4.0)] }),
  h(15, 'hatch.zdivo-mrizka', 'Zdivo – mřížka', { families: [lines(45, 2.0), lines(135, 2.0)] }),
  h(16, 'hatch.zdivo-carkovana', 'Zdivo – čárkovaná', {
    variantOf: 'hatch.zdivo',
    families: [lines(45, 2.0, [2.4, 1.2])],
  }),
  h(17, 'hatch.zdivo-husta-mrizka', 'Zdivo – hustá mřížka', {
    families: [lines(45, 1.0), lines(135, 1.0)],
  }),
  h(18, 'hatch.zdivo-svislice-sikme', 'Zdivo – svislice a šikmé', {
    variantOf: 'hatch.zdivo',
    families: [lines(90, 2.0), lines(45, 2.0)],
  }),
  h(19, 'hatch.dilce', 'Dílce (prefabrikáty)', { families: [lines(90, 4.0)] }),
];
