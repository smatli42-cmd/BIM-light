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
import { sectionElementsQuery, sectionList, sectionPresetList } from './sections.ts';
import { levelDimList, levelDimTargets } from './level-dims.ts';
import { compositionList } from './compositions.ts';
import { slabList, slabOpeningList, slabTypeList } from './slabs.ts';
import { outlineTempDimensionList } from './outline-dims.ts';
import { wallTopSlab } from './wall-top.ts';
import { roomCategoryList, roomList } from './rooms.ts';
import { wallTypeLibrary, wallTypeList } from './wall-types.ts';
import { coveringSurfaces, coveringTypeList } from './coverings.ts';
import { coveringRoom } from './covering-room.ts';
import { coveringJoints, coveringTiles } from './covering-tiles.ts';

export const CORE_QUERIES = [
  projectInfo,
  wallList,
  wallFindSame,
  modelCheck,
  wallGet,
  wallPropertiesQuery,
  openingList,
  slabList,
  wallTopSlab,
  slabOpeningList,
  roomList,
  roomCategoryList,
  coveringTypeList,
  coveringRoom,
  coveringSurfaces,
  coveringJoints,
  coveringTiles,
  outlineTempDimensionList,
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
  sectionList,
  sectionElementsQuery,
  sectionPresetList,
  levelDimList,
  levelDimTargets,
  compositionList,
];
