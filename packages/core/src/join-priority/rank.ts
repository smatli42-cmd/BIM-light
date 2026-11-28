// Jedna funkce priority spojování (základ 7): všechny výpočty spojů (roh, T, kříž, uložení stropu) berou
// prioritu materiálu odsud. Priorita = pořadí úrovně v tabulce projektu, ne číslo u materiálu.
import type { Id } from '../ids/index.ts';
import type { Material } from '../material/types.ts';
import type { Model } from '../model/types.ts';
import type { JoinLevel } from './types.ts';

type WithPriorities = Pick<Model, 'materials' | 'joinPriorities'>;

/** Id úrovně materiálu: výjimka u materiálu, jinak úroveň jeho kategorie. */
export function materialLevelId(model: WithPriorities, m: Material): Id {
  const own = m.joinLevelId;
  if (own && model.joinPriorities.levels.some((l) => l.id === own)) return own;
  return model.joinPriorities.categoryLevels[m.category];
}

/** Úroveň materiálu (nebo undefined, když materiál ani úroveň neexistují). */
export function materialLevel(model: WithPriorities, materialId: Id): JoinLevel | undefined {
  const m = model.materials[materialId];
  if (!m) return undefined;
  const id = materialLevelId(model, m);
  return model.joinPriorities.levels.find((l) => l.id === id);
}

/**
 * Priorita spojování materiálu: horní úroveň = počet úrovní, spodní = 1, neznámý materiál = 0.
 * Vyšší číslo projede nižší; stejné = pokos (roh) / zastaví se (T).
 */
export function joinRank(model: WithPriorities, materialId: Id): number {
  const lv = materialLevel(model, materialId);
  if (!lv) return 0;
  const levels = model.joinPriorities.levels;
  return levels.length - levels.findIndex((l) => l.id === lv.id);
}

/** Priorita pro IFC (IfcMaterialLayer.Priority 0–100). */
export function joinRankPercent(model: WithPriorities, materialId: Id): number {
  const n = model.joinPriorities.levels.length;
  return n ? Math.round((100 * joinRank(model, materialId)) / n) : 0;
}
