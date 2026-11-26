// Export do IFC4 (plán stěn Z3, Z4, Z5, Z7): projekt, pozemek, budova, podlaží a stěny se skladbou,
// výškou, otvory, stavem a vlastnostmi (Pset_WallCommon). Výstup je text; zápis do souboru
// dělá aplikace přes Platform (základ 13).
import { allWalls, type Id, type Model, type Wall } from '@bim-light/core';
import { createContext } from './context.ts';
import { derivedGlobalId } from './guid.ts';
import { writeTypes } from './materials.ts';
import { writeSpatial } from './spatial.ts';
import { StepWriter, str, type Raw } from './step.ts';
import { writeWall } from './wall.ts';

export const IFC_SCHEMA = 'IFC4';

export interface IfcExportOptions {
  /** Název souboru v hlavičce. */
  readonly fileName?: string;
  /** Čas v hlavičce (ISO); pro stejný výstup při opakování ho jde zadat. */
  readonly timestamp?: string;
}

/** Stěny hlavního modelu (varianty se zatím neexportují, kreslí se také jen hlavní model). */
const exportedWalls = (m: Model): Wall[] => allWalls(m).filter((w) => w.variant.kind === 'main');

/** Vytvoří obsah souboru IFC z modelu. */
export function exportIfc(m: Model, opts: IfcExportOptions = {}): string {
  const w = new StepWriter();
  const c = createContext(w);
  const spatial = writeSpatial(c, m);
  const walls = exportedWalls(m);
  const types = writeTypes(
    c,
    m,
    walls.map((x) => x.typeId),
  );
  const byStorey = new Map<Id, Raw[]>();
  const byType = new Map<Id, Raw[]>();
  for (const wall of walls) {
    const storey = spatial.storeys.get(wall.storeyId);
    const type = types.get(wall.typeId);
    if (!storey || !type) continue;
    const entity = writeWall(c, m, wall, storey, type);
    byStorey.set(wall.storeyId, [...(byStorey.get(wall.storeyId) ?? []), entity]);
    byType.set(wall.typeId, [...(byType.get(wall.typeId) ?? []), entity]);
  }
  for (const [storeyId, els] of byStorey) {
    const s = spatial.storeys.get(storeyId);
    if (!s) continue;
    w.add('IfcRelContainedInSpatialStructure', [
      str(derivedGlobalId(`${storeyId}/contains`)),
      null,
      null,
      null,
      els,
      s.entity,
    ]);
  }
  for (const [typeId, els] of byType) {
    const t = types.get(typeId);
    if (t)
      w.add('IfcRelDefinesByType', [
        str(derivedGlobalId(`${typeId}/defines`)),
        null,
        null,
        null,
        els,
        t.wallType,
      ]);
  }
  return w.toText({
    name: opts.fileName ?? `${m.project.name}.ifc`,
    stamp: opts.timestamp ?? '2000-01-01T00:00:00',
    schema: IFC_SCHEMA,
  });
}
