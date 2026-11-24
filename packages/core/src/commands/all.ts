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
import { projectSetGeoreference, storeyCreate, storeyUpdate } from './project/storey.ts';
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
import { wallCreate } from './wall/create.ts';
import { wallMoveEndpoint, wallSetLength } from './wall/endpoint.ts';
import { wallMove, wallOffset, wallRotate } from './wall/move.ts';
import { wallFlipSide, wallSetHeight, wallSetProperties, wallSetType } from './wall/properties.ts';
import { wallSplit } from './wall/split.ts';
import { wallSetReferenceLine, wallSetThickness } from './wall/thickness.ts';

export const CORE_COMMANDS = [
  storeyCreate,
  storeyUpdate,
  projectSetGeoreference,
  wallCreate,
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
  wallConnect,
  wallDisconnect,
  dimensionCreate,
  dimensionDelete,
  dimensionSetLocked,
  dimensionSetValue,
  dimensionSetOffset,
  dimensionSetText,
  dimensionSetAlignGroup,
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
];

/** Registr se všemi příkazy jádra. */
export function createCoreRegistry(): CommandRegistry {
  const r = new CommandRegistry();
  for (const c of CORE_COMMANDS) r.register(c);
  return r;
}
