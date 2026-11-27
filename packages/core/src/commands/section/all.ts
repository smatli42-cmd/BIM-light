// Všechny příkazy řezů a pohledů pohromadě (registr jádra je přidá najednou).
import { elevationCreate } from './elevation.ts';
import { sectionCreate, sectionDelete, sectionRename, sectionUpdate } from './section.ts';

export const SECTION_COMMANDS = [
  sectionCreate,
  sectionUpdate,
  sectionRename,
  sectionDelete,
  elevationCreate,
] as const;
