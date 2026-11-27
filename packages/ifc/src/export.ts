// Export do IFC4 (plán stěn Z3, Z4, Z5, Z7, desky D1): projekt, pozemek, budova, podlaží, stěny a desky se skladbou,
// výškou, otvory, stavem a vlastnostmi (Pset_WallCommon). Výstup je text; zápis do souboru
// dělá aplikace přes Platform (základ 13).
import { allSlabs, allWalls, type Id, type Model, type Wall } from '@bim-light/core';
import { createContext, type IfcContext } from './context.ts';
import { derivedGlobalId } from './guid.ts';
import { writeTypes } from './materials.ts';
import { writeSpatial } from './spatial.ts';
import { StepWriter, str, type Raw } from './step.ts';
import { writeWall } from './wall.ts';
import { writeSlabs } from './slab.ts';
import { writeSlabOpenings } from './slab-opening.ts';
import { writeSpaces } from './space.ts';

export const IFC_SCHEMA = 'IFC4';

export interface IfcExportOptions {
  /** Název souboru v hlavičce. */
  readonly fileName?: string;
  /** Čas v hlavičce (ISO); pro stejný výstup při opakování ho jde zadat. */
  readonly timestamp?: string;
}

/** Stěny hlavního modelu (varianty se zatím neexportují, kreslí se také jen hlavní model). */
const exportedWalls = (m: Model): Wall[] => allWalls(m).filter((w) => w.variant.kind === 'main');

type Spatial = ReturnType<typeof writeSpatial>;

/** Stěny se skladbou; vrací entity po podlažích a vztahy k typům (Rel přidá `writeRelations`). */
function writeWalls(c: IfcContext, m: Model, spatial: Spatial) {
  const walls = exportedWalls(m);
  const types = writeTypes(
    c,
    m,
    walls.map((x) => x.typeId),
  );
  const byStorey = new Map<Id, Raw[]>();
  const byType = new Map<string, { type: Raw; els: Raw[] }>();
  for (const wall of walls) {
    const storey = spatial.storeys.get(wall.storeyId);
    const type = types.get(wall.typeId);
    if (!storey || !type) continue;
    const entity = writeWall(c, m, wall, storey, type);
    byStorey.set(wall.storeyId, [...(byStorey.get(wall.storeyId) ?? []), entity]);
    byType.set(wall.typeId, { type: type.wallType, els: [...(byType.get(wall.typeId)?.els ?? []), entity] });
  }
  return { byStorey, byType };
}

type Groups = { byStorey: Map<Id, Raw[]>; byType: Map<string, { type: Raw; els: Raw[] }> };

/** Vztahy: prvky v podlaží (IfcRelContainedInSpatialStructure) a prvky k typu (IfcRelDefinesByType). */
function writeRelations(c: IfcContext, spatial: Spatial, groups: readonly Groups[]) {
  const byStorey = new Map<Id, Raw[]>();
  for (const g of groups)
    for (const [id, els] of g.byStorey) byStorey.set(id, [...(byStorey.get(id) ?? []), ...els]);
  for (const [storeyId, els] of byStorey) {
    const s = spatial.storeys.get(storeyId);
    if (!s) continue;
    c.w.add('IfcRelContainedInSpatialStructure', [
      str(derivedGlobalId(`${storeyId}/contains`)),
      null,
      null,
      null,
      els,
      s.entity,
    ]);
  }
  for (const g of groups)
    for (const [key, { type, els }] of g.byType)
      c.w.add('IfcRelDefinesByType', [str(derivedGlobalId(`${key}/defines`)), null, null, null, els, type]);
}

/** Vytvoří obsah souboru IFC z modelu. */
export function exportIfc(m: Model, opts: IfcExportOptions = {}): string {
  const w = new StepWriter();
  const c = createContext(w);
  const spatial = writeSpatial(c, m);
  const walls = writeWalls(c, m, spatial);
  const main = allSlabs(m).filter((s) => s.variant.kind === 'main');
  const slabs = writeSlabs(c, m, main, spatial.storeys);
  writeSlabOpenings(c, m, slabs.byId);
  writeRelations(c, spatial, [walls, slabs]);
  writeSpaces(c, m, spatial.storeys);
  return w.toText({
    name: opts.fileName ?? `${m.project.name}.ifc`,
    stamp: opts.timestamp ?? '2000-01-01T00:00:00',
    schema: IFC_SCHEMA,
  });
}
