// Knihovna šraf, skupina zeminy a sypaniny. Vzhled podle ČSN 01 3420 (grafické označení hmot),
// kresleno vlastními rodinami, ne kopií obrázků. Rozměry v mm na papíře.
import { entry, lines, marks, motif, type Hatch } from '../types.ts';
import { seg, tri } from './shapes.ts';

const h = entry('zeminy');

/** Šipka dolů: dřík a hrot. */
const ARROW = [seg(0, 0.9, 0, -0.9), seg(-0.55, -0.3, 0, -0.9), seg(0.55, -0.3, 0, -0.9)];

/** Krátké čárky různých směrů v jedné buňce (vypadají náhodně). */
const DASHES = [
  seg(-1.9, -1.2, -1.0, -0.3),
  seg(0.4, -1.8, 0.7, -0.6),
  seg(1.2, 0.2, 2.1, -0.2),
  seg(-1.6, 1.1, -0.8, 1.7),
  seg(-0.1, 0.4, 0.5, 1.3),
  seg(1.0, 1.7, 1.9, 1.6),
];

export const ZEMINY: readonly Hatch[] = [
  h(3, 'hatch.teren', 'Terén (zemina)', { families: [lines(45, 2.0)] }),
  h(4, 'hatch.zasypy', 'Zásypy a násypy', { families: [lines(45, 2.0, [1.6, 1.6])] }),
  h(5, 'hatch.zeminy-kamenivo', 'Zeminy – kamenivo', {
    variantOf: 'hatch.teren',
    families: [
      marks('dot', 0.3, 3.4, 2.9, 1.7, 17),
      motif([tri(0, 0, 0.5, 0.3), tri(2.6, 2.2, 0.45, 2.1)], 6.4, 5.6, 3.2),
    ],
  }),
  h(6, 'hatch.zeminy-carky', 'Zeminy – čárky', {
    variantOf: 'hatch.teren',
    families: [motif(DASHES, 4.8, 4.0, 2.4)],
  }),
  h(7, 'hatch.zeminy-sipky', 'Zeminy – šipky', {
    variantOf: 'hatch.teren',
    families: [motif(ARROW, 4.8, 4.0, 2.4)],
  }),
  h(8, 'hatch.sterk', 'Štěrk', { families: [marks('dot', 0.45, 2.4, 2.0, 1.2)] }),
];
