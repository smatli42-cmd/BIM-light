// Stěna a rovina řezu pohledu (plán stěn Z6, stejné pravidlo jako u otvorů v Z4): stěna, kterou rovina
// protíná, je v řezu; stěna celá pod rovinou (parapetní zídka) je v pohledu; celá nad rovinou čárkovaně.
import type { Model } from '../model/types.ts';
import { wallHeight } from '../wall-height/resolve.ts';
import type { Wall } from './types.ts';

export type WallCut = 'cut' | 'below' | 'above';

/** Vztah stěny k rovině řezu `cutPlane` (mm nad podlažím stěny). */
export function wallCutRelation(model: Model, wall: Wall, cutPlane: number): WallCut {
  const level = (model.storeys[wall.storeyId]?.elevation ?? 0) + cutPlane;
  const { bottom, top } = wallHeight(model, wall);
  if (level < bottom) return 'above';
  if (level > top) return 'below';
  return 'cut';
}
