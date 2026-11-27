// Příkazy úprav povrchů (prvky stavby 9) pro registr jádra.
import { coveringAssign, coveringSetZones } from './assign.ts';
import { coveringSetOrigin } from './origin.ts';
import { styleSetTileJoints } from './style.ts';
import { coveringTypeCreate, coveringTypeDelete, coveringTypeDuplicate, coveringTypeUpdate } from './type.ts';

export const COVERING_COMMANDS = [
  coveringTypeCreate,
  coveringTypeUpdate,
  coveringTypeDuplicate,
  coveringTypeDelete,
  coveringSetZones,
  coveringAssign,
  coveringSetOrigin,
  styleSetTileJoints,
] as const;
