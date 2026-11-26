// Pset_WallCommon (plán stěn Z7): vlastnosti z popisu parametrů jádra (základ 15b) – Reference (název
// typu), LoadBearing, IsExternal, FireRating, AcousticRating; u instance navíc Status (stav prvku).
// Typ dostane hodnoty typu (IfcWallType.HasPropertySets), instance výsledné hodnoty i s přepisy.
import {
  IFC_WALL_TYPE,
  WALL_FUNCTION_LABELS,
  WALL_PROPERTY_PARAMS,
  type Status,
  type WallProperties,
} from '@bim-light/core';
import type { IfcContext } from './context.ts';
import { derivedGlobalId } from './guid.ts';
import { bool, str, typed, type Raw } from './step.ts';

const STATUS: Record<Status, string> = { existing: 'EXISTING', demolished: 'DEMOLISH', new: 'NEW' };

const single = (c: IfcContext, name: string, value: Raw): Raw =>
  c.w.add('IfcPropertySingleValue', [str(name), null, value, null]);

function properties(c: IfcContext, reference: string, p: WallProperties, status?: Status): Raw[] {
  const out = [single(c, 'Reference', typed('IFCIDENTIFIER', str(reference)))];
  if (status)
    out.push(
      c.w.add('IfcPropertyEnumeratedValue', [
        str('Status'),
        null,
        [typed('IFCLABEL', str(STATUS[status]))],
        null,
      ]),
    );
  for (const d of WALL_PROPERTY_PARAMS) {
    if (!d.ifc) continue;
    const v = p[d.key];
    if (typeof v === 'boolean') out.push(single(c, d.ifc.name, typed('IFCBOOLEAN', bool(v))));
    else if (typeof v === 'string' && v.trim()) out.push(single(c, d.ifc.name, typed('IFCLABEL', str(v))));
  }
  return out;
}

/** Sada vlastností Pset_WallCommon (bez vazby; typ ji odkazuje sám, instance přes vztah). */
export function wallCommonPset(
  c: IfcContext,
  key: string,
  reference: string,
  p: WallProperties,
  status?: Status,
): Raw {
  return c.w.add('IfcPropertySet', [
    str(derivedGlobalId(`${key}/pset`)),
    null,
    str('Pset_WallCommon'),
    null,
    properties(c, reference, p, status),
  ]);
}

/** Pset_WallCommon instance stěny s vazbou IfcRelDefinesByProperties. */
export function writeOccurrencePset(
  c: IfcContext,
  wallId: string,
  wall: Raw,
  reference: string,
  p: WallProperties,
  status: Status,
) {
  const pset = wallCommonPset(c, wallId, reference, p, status);
  c.w.add('IfcRelDefinesByProperties', [
    str(derivedGlobalId(`${wallId}/pset-rel`)),
    null,
    null,
    null,
    [wall],
    pset,
  ]);
}

/** PredefinedType a (u USERDEFINED) název druhu podle funkce stěny. */
export function predefined(p: WallProperties): { type: string; userType: string | null } {
  const type = IFC_WALL_TYPE[p.function];
  return { type, userType: type === 'USERDEFINED' ? WALL_FUNCTION_LABELS[p.function] : null };
}
