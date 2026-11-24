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
import { dimensionCreateSet, dimensionFlipSide, dimensionPlace } from './dimension/place.ts';
import { projectSetGeoreference, storeyCreate, storeyUpdate } from './project/storey.ts';
import { CORE_QUERIES } from '../queries/all.ts';
import { CommandRegistry } from './registry.ts';
import { displayImport, displaySetPenWidth, styleSaveFromView } from './view/display.ts';
import { elementSetGraphicOverride } from './view/overrides.ts';
import {
  viewCreate,
  viewResetToStyle,
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
import { wallFlipSide, wallSetHeight, wallSetProperties, wallSetType } from './wall/properties.ts';
import { wallSplit } from './wall/split.ts';
import { wallDeleteNode } from './wall/merge.ts';
import { selectionDelete } from './edit/delete.ts';
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
  projectSetGeoreference,
  wallCreate,
  wallChain,
  wallDelete,
  wallMove,
  wallRotate,
  wallOffset,
  wallMoveEndpoint,
  wallSetLength,
  wallFlipSide,
  wallSetType,
  wallSetThickness,
  wallSetReferenceLine,
  wallSetHeight,
  wallSetProperties,
  wallSplit,
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
  viewCreate,
  viewSetStyle,
  viewSetScale,
  viewSetLayerState,
  viewSetOverrideCombination,
  viewSetDetail,
  viewResetToStyle,
  viewSetActiveAnnotationLayer,
  elementSetGraphicOverride,
  styleSaveFromView,
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
  wallTypeUpdateLayer,
];

/** Registr se všemi příkazy jádra. */
export function createCoreRegistry(): CommandRegistry {
  const r = new CommandRegistry();
  for (const c of CORE_COMMANDS) r.register(c);
  for (const q of CORE_QUERIES) r.registerQuery(q);
  return r;
}
