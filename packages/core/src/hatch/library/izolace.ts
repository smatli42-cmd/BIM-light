// Knihovna šraf, skupina izolace. Vzhled podle ČSN 01 3420: tepelná = cik-cak s očky přes celou
// šířku vrstvy (jako Revit / Archicad / Ardit),
// akustická = vysoký cik-cak, obecná = mřížka s kroužky, proti vodě = vyčerněná. Rozměry v mm na papíře.
import { band, entry, lines, motif, wave, type Hatch } from '../types.ts';
import { hex, ring, tri } from './shapes.ts';

const h = entry('izolace');

const G = 3.2;
/** Plástve: šestiúhelníky o poloměru R těsně vedle sebe. */
const R = 0.9;
const W = R * Math.sqrt(3);

export const IZOLACE: readonly Hatch[] = [
  h(24, 'hatch.tepelna-izolace', 'Tepelná izolace', {
    /** Smyčka 0,65 × šířka vrstvy, očko 0,3 × šířka (podle Arditu). */
    families: [band(0.65, 0.3)],
    version: 4,
  }),
  h(25, 'hatch.izolace-obecna', 'Izolace obecná', {
    families: [lines(45, G), lines(135, G), motif([ring(G / 2, G / 2, 0.45)], G, G, 0, 45)],
  }),
  h(26, 'hatch.akusticka-izolace', 'Akustická izolace', { families: [wave('zigzag', 3.2, 2.8, 6.4)] }),
  h(27, 'hatch.izolace-plastve', 'Izolace – plástve', {
    variantOf: 'hatch.tepelna-izolace',
    families: [motif([hex(0, 0, R)], W, 1.5 * R, W / 2)],
  }),
  h(28, 'hatch.izolace-trojuhelniky', 'Izolace – trojúhelníky', {
    variantOf: 'hatch.tepelna-izolace',
    families: [motif([tri(0, 0, 0.75)], 2.4, 2.4)],
  }),
  h(29, 'hatch.izolace-krouzky', 'Izolace – kroužky', {
    variantOf: 'hatch.tepelna-izolace',
    families: [motif([hex(0, 0, 1.2)], 4.0, 3.4, 2.0)],
  }),
  h(30, 'hatch.izolace-voda', 'Izolace proti vodě (vyčerněná)', { solid: true }),
];
