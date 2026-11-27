// Všechny příkazy řezů a pohledů pohromadě (registr jádra je přidá najednou).
import { elevationCreate } from './elevation.ts';
import { sectionCreate, sectionDelete, sectionMove, sectionRename, sectionUpdate } from './section.ts';
import { sectionPresetCreate, sectionPresetDelete, sectionPresetUpdate } from './preset.ts';

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
] as const;
