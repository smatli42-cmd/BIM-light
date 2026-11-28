// Příkazy střech (rozhodnutí 11, S1 a S2) pro registr jádra.
import { roofCreate } from './create.ts';
import { roofMove, roofSetEdge, roofUpdate } from './edit.ts';
import { roofMoveVertex, roofSetOutline } from './outline.ts';

export const ROOF_COMMANDS = [
  roofCreate,
  roofSetEdge,
  roofUpdate,
  roofMove,
  roofMoveVertex,
  roofSetOutline,
] as const;
