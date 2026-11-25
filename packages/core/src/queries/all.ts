// Všechny dotazy jádra (čtení modelu pro AI). Nový dotaz = nový soubor + řádek zde.
import { dimensionList } from './dimensions.ts';
import { elementFind } from './find.ts';
import { hatchList, materialList } from './materials.ts';
import { openingList } from './openings.ts';
import { projectInfo } from './project.ts';
import { viewInfo } from './views.ts';
import { wallGet, wallList } from './walls.ts';
import { wallTypeLibrary, wallTypeList } from './wall-types.ts';

export const CORE_QUERIES = [
  projectInfo,
  wallList,
  wallGet,
  openingList,
  dimensionList,
  hatchList,
  materialList,
  viewInfo,
  wallTypeList,
  wallTypeLibrary,
  elementFind,
];
