// Příkazy místností (prvky stavby 9) pro registr jádra.
import { roomCategoryCreate, roomCategoryDelete, roomCategoryUpdate, styleSetRoomStamp } from './category.ts';
import { roomCreate, roomDelete } from './room.ts';
import { roomUpdate } from './update.ts';

export const ROOM_COMMANDS = [
  roomCreate,
  roomUpdate,
  roomDelete,
  roomCategoryCreate,
  roomCategoryUpdate,
  roomCategoryDelete,
  styleSetRoomStamp,
] as const;
