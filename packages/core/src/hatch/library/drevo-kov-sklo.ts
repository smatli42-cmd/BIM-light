// Knihovna šraf, skupina dřevo, kov a sklo. Vzhled je návrh podle názvu (k porovnání s arditem).
import { entry, lines, wave, type Hatch } from '../types.ts';

const h = entry('drevo-kov-sklo');

export const DREVO_KOV_SKLO: readonly Hatch[] = [
  h(20, 'hatch.drevo', 'Dřevo', { families: [wave('sine', 0.4, 4, 1.2)] }),
  h(32, 'hatch.kovy', 'Kovy', { families: [lines(45, 1)] }),
  h(33, 'hatch.sklo', 'Sklo', { families: [lines(45, 4, [2, 6])] }),
  h(34, 'hatch.ploche-sklo', 'Ploché sklo', { families: [lines(0, 1)] }),
];
