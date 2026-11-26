// Skladba stěn v IFC: materiály, sada vrstev typu (IfcMaterialLayerSet) a typ stěny (IfcWallType).
// Vrstvy jdou ve stejném pořadí jako v modelu: od referenční strany ke straně tloušťky.
// Typ nese Pset_WallCommon s vlastnostmi typu a PredefinedType podle funkce (plán stěn Z7).
import {
  bandAt,
  DEFAULT_CUT_HEIGHT,
  type Id,
  type LayerFunction,
  type Model,
  typeProperties,
  type WallType,
} from '@bim-light/core';
import type { IfcContext } from './context.ts';
import { derivedGlobalId, modelGlobalId } from './guid.ts';
import { predefined, wallCommonPset } from './pset.ts';
import { bool, en, int, str, type Raw } from './step.ts';

/** Doporučené kategorie vrstev IFC4 podle funkce vrstvy. */
const LAYER_CATEGORY: Record<LayerFunction, string> = {
  core: 'LoadBearing',
  insulation: 'Insulation',
  finish: 'Finish',
};

export interface TypeRefs {
  readonly layerSet: Raw;
  readonly wallType: Raw;
  /** Celková tloušťka exportovaných vrstev (mm). */
  readonly thickness: number;
}

/** Vrstvy typu, které se exportují: pás v rovině řezu (jako půdorys). */
export const exportBand = (t: WallType) => bandAt(t, DEFAULT_CUT_HEIGHT);

function material(c: IfcContext, m: Model, cache: Map<Id, Raw>, id: Id): Raw {
  const hit = cache.get(id);
  if (hit) return hit;
  const mat = m.materials[id];
  const ref = c.w.add('IfcMaterial', [str(mat?.name ?? 'Neznámý materiál'), null, str(mat?.category ?? '')]);
  cache.set(id, ref);
  return ref;
}

function writeType(c: IfcContext, m: Model, t: WallType, mats: Map<Id, Raw>): TypeRefs {
  const band = exportBand(t);
  const layers = band.layers.map((l) => {
    const mat = material(c, m, mats, l.materialId);
    const priority = m.materials[l.materialId]?.joinPriority;
    return c.w.add('IfcMaterialLayer', [
      mat,
      l.thickness,
      bool(false),
      str(m.materials[l.materialId]?.name ?? ''),
      null,
      str(LAYER_CATEGORY[l.function]),
      priority === undefined ? null : int(priority),
    ]);
  });
  const layerSet = c.w.add('IfcMaterialLayerSet', [layers, str(t.name), null]);
  const props = typeProperties(t);
  const kind = predefined(props);
  const wallType = c.w.add('IfcWallType', [
    str(modelGlobalId(t.id)),
    null,
    str(t.name),
    null,
    null,
    [wallCommonPset(c, t.id, t.name, props)],
    null,
    null,
    kind.userType === null ? null : str(kind.userType),
    en(kind.type),
  ]);
  c.w.add('IfcRelAssociatesMaterial', [
    str(derivedGlobalId(`${t.id}/material`)),
    null,
    null,
    null,
    [wallType],
    layerSet,
  ]);
  const thickness = band.layers.reduce((s, l) => s + l.thickness, 0);
  return { layerSet, wallType, thickness };
}

/** Zapíše typy stěn, které nějaká stěna používá. */
export function writeTypes(c: IfcContext, m: Model, usedTypeIds: Iterable<Id>): Map<Id, TypeRefs> {
  const mats = new Map<Id, Raw>();
  const out = new Map<Id, TypeRefs>();
  for (const id of usedTypeIds) {
    const t = m.wallTypes[id];
    if (t && !out.has(id)) out.set(id, writeType(c, m, t, mats));
  }
  return out;
}
