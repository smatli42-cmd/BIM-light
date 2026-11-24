// Knihovna šraf, skupina zeminy a sypaniny. Vzhled je návrh podle názvu (k porovnání s arditem).
import { entry, lines, marks, type Hatch } from '../types.ts';

const h = entry('zeminy');
const TEREN = [lines(45, 2, [3, 1.2])];

export const ZEMINY: readonly Hatch[] = [
  h(3, 'hatch.teren', 'Terén (zemina)', { families: TEREN }),
  h(4, 'hatch.zasypy', 'Zásypy a násypy', { families: [lines(45, 3, [1, 2]), marks('dot', 0.3, 1.5)] }),
  h(5, 'hatch.zeminy-kamenivo', 'Zeminy – kamenivo', {
    variantOf: 'hatch.teren',
    families: [...TEREN, marks('circle', 0.7, 3)],
  }),
  h(6, 'hatch.zeminy-carky', 'Zeminy – čárky', {
    variantOf: 'hatch.teren',
    families: [lines(45, 2, [0.8, 1.6])],
  }),
  h(7, 'hatch.zeminy-sipky', 'Zeminy – šipky', {
    variantOf: 'hatch.teren',
    families: [...TEREN, marks('arrow', 1, 3, 3, 1.5, 45)],
  }),
  h(8, 'hatch.sterk', 'Štěrk', { families: [marks('circle', 0.6, 1.6, 1.4)] }),
];
