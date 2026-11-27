// Příkazy desek a otvorů v deskách (D1–D4) pro registr jádra.
import { outlineSetDistance } from './distance.ts';
import { slabCreate } from './create.ts';
import { slabMove, slabMoveVertex, slabSetOutline, slabUpdate } from './edit.ts';
import { slabTypeDelete, slabTypeDuplicate, slabTypeUpdate } from './type.ts';
import { slabOpeningCreate } from '../slab-opening/create.ts';
import { slabOpeningMove, slabOpeningMoveVertex, slabOpeningSetOutline } from '../slab-opening/edit.ts';

export const SLAB_COMMANDS = [
  slabCreate,
  slabUpdate,
  slabSetOutline,
  slabMoveVertex,
  slabMove,
  slabOpeningCreate,
  slabOpeningSetOutline,
  slabOpeningMoveVertex,
  slabOpeningMove,
  outlineSetDistance,
  slabTypeDuplicate,
  slabTypeUpdate,
  slabTypeDelete,
] as const;
