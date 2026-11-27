// Všechny příkazy 3D pohledu pohromadě (registr jádra je přidá najednou).
import { view3dSetLayerState, view3dSetPhaseFilter, view3dSetStyle } from './display.ts';
import {
  view3dSetCutPlane,
  view3dSetGrid,
  view3dSetProjection,
  view3dSetRenderMode,
  view3dSetSun,
} from './look.ts';
import {
  view3dCreate,
  view3dDelete,
  view3dRename,
  view3dSetSectionBox,
  view3dSetStoreys,
} from './view-3d.ts';

export const VIEW3D_COMMANDS = [
  view3dCreate,
  view3dRename,
  view3dDelete,
  view3dSetStoreys,
  view3dSetSectionBox,
  view3dSetStyle,
  view3dSetPhaseFilter,
  view3dSetLayerState,
  view3dSetProjection,
  view3dSetRenderMode,
  view3dSetSun,
  view3dSetCutPlane,
  view3dSetGrid,
] as const;
