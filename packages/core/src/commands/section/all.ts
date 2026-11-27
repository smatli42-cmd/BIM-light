// Všechny příkazy řezů a pohledů pohromadě (registr jádra je přidá najednou).
import { elevationCreate } from './elevation.ts';
import { sectionCreate, sectionDelete, sectionMove, sectionRename, sectionUpdate } from './section.ts';
import { sectionPresetCreate, sectionPresetDelete, sectionPresetUpdate } from './preset.ts';
import { levelDimCreate, levelDimDelete, levelDimMove, levelDimUpdate } from '../level-dim/level-dim.ts';
import { styleSetLevelMarkFill } from '../level-dim/style.ts';
import { planLevelDimCreate, planLevelDimMove, planLevelDimUpdate } from '../level-dim/plan.ts';

export const SECTION_COMMANDS = [
  sectionCreate,
  sectionUpdate,
  sectionMove,
  sectionRename,
  sectionDelete,
  elevationCreate,
  sectionPresetCreate,
  sectionPresetUpdate,
  sectionPresetDelete,
  levelDimCreate,
  levelDimMove,
  levelDimUpdate,
  levelDimDelete,
  styleSetLevelMarkFill,
  planLevelDimCreate,
  planLevelDimMove,
  planLevelDimUpdate,
] as const;
