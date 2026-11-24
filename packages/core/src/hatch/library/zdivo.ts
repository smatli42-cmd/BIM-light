// Knihovna šraf, skupina zdivo a dílce. Vzhled je návrh podle názvu (k porovnání s arditem).
import { entry, lines, type Hatch } from '../types.ts';

const h = entry('zdivo');

export const ZDIVO: readonly Hatch[] = [
  h(14, 'hatch.zdivo', 'Zdivo', { families: [lines(45, 2)] }),
  h(15, 'hatch.zdivo-mrizka', 'Zdivo – mřížka', { families: [lines(45, 2), lines(135, 2)] }),
  h(16, 'hatch.zdivo-carkovana', 'Zdivo – čárkovaná', {
    variantOf: 'hatch.zdivo',
    families: [lines(45, 2, [1.5, 0.75])],
  }),
  h(17, 'hatch.zdivo-husta-mrizka', 'Zdivo – hustá mřížka', { families: [lines(45, 1), lines(135, 1)] }),
  h(18, 'hatch.zdivo-svislice-sikme', 'Zdivo – svislice a šikmé', {
    variantOf: 'hatch.zdivo',
    families: [lines(90, 2), lines(45, 2)],
  }),
  h(19, 'hatch.dilce', 'Dílce (prefabrikáty)', { families: [lines(90, 3)] }),
];
