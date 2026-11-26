// Všechny příkazy jádra v jednom registru (základ 15a). Nový příkaz = nový soubor + řádek zde.
import { dimensionCreate } from './dimension/create.ts';
import {
  dimensionDelete,
  dimensionSetAlignGroup,
  dimensionSetLocked,
  dimensionSetOffset,
  dimensionSetText,
} from './dimension/edit.ts';
import { dimensionSetValue } from './dimension/set-value.ts';
import { dimensionEqualize } from './dimension/equalize.ts';
import { dimensionWholeWall } from './dimension/whole-wall.ts';
import { dimensionCreateSet, dimensionFlipSide, dimensionPlace } from './dimension/place.ts';
import { projectSetGeoreference, storeyCreate } from './project/storey.ts';
import { storeyDelete, storeyUpdate } from './project/storey-edit.ts';
import { CORE_QUERIES } from '../queries/all.ts';
import { CommandRegistry } from './registry.ts';
import { displayImport, displaySetPenWidth, styleSaveFromView, styleSetHatchScale } from './view/display.ts';
import { styleSetWallDrawing } from './view/wall-drawing.ts';
import { viewSetPhaseFilter } from './view/phase.ts';
import { elementSetGraphicOverride } from './view/overrides.ts';
import { viewDelete, viewLoadSettings, viewRename, viewSave } from './view/saved.ts';
import {
  viewCreate,
  viewResetToStyle,
  viewSetLayerCombination,
  viewSetLayerStates,
  viewSetActiveAnnotationLayer,
  viewSetDetail,
  viewSetLayerState,
  viewSetOverrideCombination,
  viewSetScale,
  viewSetStyle,
} from './view/view.ts';
import { wallConnect, wallDelete, wallDisconnect } from './wall/connect.ts';
import { wallCross, wallSetJoin } from './wall/join.ts';
import { wallCreate } from './wall/create.ts';
import { wallChain } from './wall/chain.ts';
import { wallCopy, wallPaste } from './wall/copy.ts';
import { wallAlign, wallRectangle, wallTrimToCorner } from './wall/corner.ts';
import { wallMoveEndpoint, wallSetLength } from './wall/endpoint.ts';
import { wallMove, wallOffset, wallRotate } from './wall/move.ts';
import { wallScale } from './wall/scale.ts';
import { wallCurve, wallStraighten } from './wall/curve.ts';
import { wallFlipSide, wallSetProperties, wallSetType } from './wall/properties.ts';
import { wallTypeSetMark, wallTypeSetProperties } from './wall-type/properties.ts';
import { scheduleCreate, scheduleDelete, scheduleUpdate } from './schedule/schedule.ts';
import { wallTagCreate, wallTagDelete, wallTagMove, wallTagTagAll } from './tag/tag.ts';
import {
  compositionDelete,
  compositionRename,
  compositionSetUse,
  wallTypeSetComposition,
} from './composition/composition.ts';
import { wallSetHeight, wallSetTopProfile } from './wall/height.ts';
import { wallSplit } from './wall/split.ts';
import { wallMatchProperties } from './wall/match.ts';
import { wallDemolishPart } from './wall/demolish.ts';
import { wallDeleteNode } from './wall/merge.ts';
import { selectionDelete } from './edit/delete.ts';
import { openingCreate } from './opening/create.ts';
import { openingDelete, openingMove, openingUpdate } from './opening/edit.ts';
import { openingCopy, openingMirror } from './opening/copy.ts';
import { viewSetCutPlane } from './view/cut-plane.ts';
import { materialCreate, materialDelete, materialDuplicate, materialUpdate } from './material/edit.ts';
import { wallTypeSetLayerMaterial } from './material/layer.ts';
import { wallSetReferenceLine, wallSetThickness } from './wall/thickness.ts';
import {
  wallTypeCreate,
  wallTypeDelete,
  wallTypeDuplicate,
  wallTypePurgeUnused,
  wallTypeRename,
} from './wall-type/edit.ts';
import {
  wallTypeAddLayer,
  wallTypeMoveLayer,
  wallTypeRemoveLayer,
  wallTypeUpdateLayer,
} from './wall-type/layers.ts';
import { wallTypeLoad } from './wall-type/load.ts';

export const CORE_COMMANDS = [
  storeyCreate,
  storeyUpdate,
  storeyDelete,
  projectSetGeoreference,
  wallCreate,
  wallChain,
  wallDelete,
  wallMove,
  wallRotate,
  wallScale,
  wallOffset,
  wallMoveEndpoint,
  wallSetLength,
  wallFlipSide,
  wallCurve,
  wallStraighten,
  wallSetType,
  wallSetThickness,
  wallSetReferenceLine,
  wallSetHeight,
  wallSetTopProfile,
  wallSetProperties,
  wallSplit,
  wallMatchProperties,
  wallDemolishPart,
  wallDeleteNode,
  selectionDelete,
  wallConnect,
  wallCopy,
  wallPaste,
  wallTrimToCorner,
  wallAlign,
  wallRectangle,
  wallDisconnect,
  wallSetJoin,
  wallCross,
  openingCreate,
  openingMove,
  openingUpdate,
  openingDelete,
  openingCopy,
  openingMirror,
  dimensionCreate,
  dimensionDelete,
  dimensionSetLocked,
  dimensionSetValue,
  dimensionSetOffset,
  dimensionSetText,
  dimensionSetAlignGroup,
  dimensionPlace,
  dimensionCreateSet,
  dimensionFlipSide,
  dimensionEqualize,
  dimensionWholeWall,
  viewCreate,
  viewSave,
  viewLoadSettings,
  viewRename,
  viewDelete,
  viewSetStyle,
  viewSetScale,
  viewSetLayerState,
  viewSetLayerCombination,
  viewSetLayerStates,
  viewSetOverrideCombination,
  viewSetDetail,
  viewResetToStyle,
  viewSetActiveAnnotationLayer,
  viewSetCutPlane,
  elementSetGraphicOverride,
  styleSaveFromView,
  styleSetHatchScale,
  styleSetWallDrawing,
  viewSetPhaseFilter,
  displayImport,
  displaySetPenWidth,
  materialCreate,
  materialDuplicate,
  materialUpdate,
  materialDelete,
  wallTypeSetLayerMaterial,
  wallTypeCreate,
  wallTypeDuplicate,
  wallTypeRename,
  wallTypeDelete,
  wallTypePurgeUnused,
  wallTypeLoad,
  wallTypeAddLayer,
  wallTypeRemoveLayer,
  wallTypeMoveLayer,
  wallTypeSetProperties,
  wallTypeSetMark,
  scheduleCreate,
  scheduleUpdate,
  scheduleDelete,
  wallTagCreate,
  wallTagTagAll,
  wallTagMove,
  wallTagDelete,
  compositionRename,
  compositionSetUse,
  compositionDelete,
  wallTypeSetComposition,
  wallTypeUpdateLayer,
];

/** Registr se všemi příkazy jádra. */
export function createCoreRegistry(): CommandRegistry {
  const r = new CommandRegistry();
  for (const c of CORE_COMMANDS) r.register(c);
  for (const q of CORE_QUERIES) r.registerQuery(q);
  return r;
}
