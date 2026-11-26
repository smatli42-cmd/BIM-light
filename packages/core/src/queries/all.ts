// Všechny dotazy jádra (čtení modelu pro AI). Nový dotaz = nový soubor + řádek zde.
import { dimensionList } from './dimensions.ts';
import { elementGraphics } from './element-graphics.ts';
import { elementInfoQuery } from './element-info.ts';
import { elementFind } from './find.ts';
import { hatchList, materialList } from './materials.ts';
import { openingList } from './openings.ts';
import { projectInfo } from './project.ts';
import { viewInfo } from './views.ts';
import { wallGet, wallList } from './walls.ts';
import { wallPropertiesQuery } from './wall-properties.ts';
import { scheduleFields, scheduleList, scheduleTable } from './schedules.ts';
import { wallTagList } from './tags.ts';
import { wallTypeLibrary, wallTypeList } from './wall-types.ts';

export const CORE_QUERIES = [
  projectInfo,
  wallList,
  wallGet,
  wallPropertiesQuery,
  openingList,
  dimensionList,
  hatchList,
  materialList,
  viewInfo,
  wallTypeList,
  wallTypeLibrary,
  elementFind,
  elementInfoQuery,
  elementGraphics,
  scheduleList,
  scheduleFields,
  scheduleTable,
  wallTagList,
];
