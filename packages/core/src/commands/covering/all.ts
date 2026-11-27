// Příkazy úprav povrchů (prvky stavby 9) pro registr jádra.
import { coveringAssign, coveringSetZones } from './assign.ts';
import { coveringTypeCreate, coveringTypeDelete, coveringTypeDuplicate, coveringTypeUpdate } from './type.ts';

export const COVERING_COMMANDS = [
  coveringTypeCreate,
  coveringTypeUpdate,
  coveringTypeDuplicate,
  coveringTypeDelete,
  coveringSetZones,
  coveringAssign,
] as const;
