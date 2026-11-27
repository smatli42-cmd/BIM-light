// Všechny dotazy jádra (čtení modelu pro AI). Nový dotaz = nový soubor + řádek zde.
import { view3dList } from './views-3d.ts';
import { dimensionList } from './dimensions.ts';
import { elementGraphics } from './element-graphics.ts';
import { elementInfoQuery } from './element-info.ts';
import { elementFind } from './find.ts';
import { hatchList, materialList } from './materials.ts';
import { openingList } from './openings.ts';
import { projectInfo } from './project.ts';
import { viewInfo } from './views.ts';
import { wallGet, wallList } from './walls.ts';
import { wallFindSame } from './wall-same.ts';
import { modelCheck } from './check.ts';
import { wallPropertiesQuery } from './wall-properties.ts';
import { scheduleFields, scheduleList, scheduleTable } from './schedules.ts';
import { wallTagList } from './tags.ts';
import { compositionList } from './compositions.ts';
import { slabList, slabOpeningList, slabTypeList } from './slabs.ts';
import { wallTypeLibrary, wallTypeList } from './wall-types.ts';

export const CORE_QUERIES = [
  projectInfo,
  wallList,
  wallFindSame,
  modelCheck,
  wallGet,
  wallPropertiesQuery,
  openingList,
  slabList,
  slabOpeningList,
  view3dList,
  slabTypeList,
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
  compositionList,
];
