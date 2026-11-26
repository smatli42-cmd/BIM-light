// Ukázky: ukázkový projekt a testovací scény (pokyn uživatele 2026-11-26).
import { HOUSE } from './house.ts';
import { SCENES } from './scenes.ts';
import type { Sample } from './types.ts';

export type { Sample, SampleContext } from './types.ts';
export { buildSample } from './build.ts';

/** Všechny ukázky: projekt nahoře, scény od nejnovější. */
export const SAMPLES: readonly Sample[] = [HOUSE, ...SCENES];

export const findSample = (key: string): Sample | undefined => SAMPLES.find((s) => s.key === key);
