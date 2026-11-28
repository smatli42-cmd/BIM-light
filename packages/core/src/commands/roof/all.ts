// Příkazy střech (rozhodnutí 11, S1) pro registr jádra.
import { roofCreate } from './create.ts';
import { roofMove, roofSetEdge, roofUpdate } from './edit.ts';

export const ROOF_COMMANDS = [roofCreate, roofSetEdge, roofUpdate, roofMove] as const;
