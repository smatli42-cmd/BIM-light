// Příkazy elektra (koncepce 3) pro registr jádra.
import { electroDelete, electroMove } from './edit.ts';
import { electroCreate, electroUpdate } from './element.ts';
import { electroTypeCreate, electroTypeDelete, electroTypeDuplicate, electroTypeUpdate } from './type.ts';

export const ELECTRO_COMMANDS = [
  electroCreate,
  electroUpdate,
  electroMove,
  electroDelete,
  electroTypeCreate,
  electroTypeDuplicate,
  electroTypeUpdate,
  electroTypeDelete,
] as const;
