// Všechny dotazy jádra (čtení modelu pro AI). Nový dotaz = nový soubor + řádek zde.
import { dimensionList } from './dimensions.ts';
import { hatchList, materialList } from './materials.ts';
import { projectInfo } from './project.ts';
import { wallGet, wallList } from './walls.ts';

export const CORE_QUERIES = [projectInfo, wallList, wallGet, dimensionList, hatchList, materialList];
