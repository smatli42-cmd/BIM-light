// Kontrola a uložení tabulky priorit spojování (příkazy material.*Priorit*). Úroveň má jedinečný
// neprázdný název, kategorie i výjimky materiálů ukazují na existující úroveň.
import { fail } from '../commands/types.ts';
import type { Id } from '../ids/index.ts';
import { MATERIAL_CATEGORIES } from '../material/types.ts';
import type { Model } from '../model/types.ts';
import type { JoinLevel, JoinPriorities } from './types.ts';

export function levelIndex(model: Model, levelId: Id): number {
  const i = model.joinPriorities.levels.findIndex((l) => l.id === levelId);
  return i >= 0 ? i : fail('not-found', `Úroveň priority ${levelId} neexistuje`);
}

function checkLevels(levels: readonly JoinLevel[]) {
  if (!levels.length) fail('invalid', 'Tabulka priorit musí mít aspoň jednu úroveň');
  const names = new Set<string>();
  const ids = new Set<string>();
  for (const l of levels) {
    const name = l.name.trim();
    if (!name) fail('invalid', 'Úroveň priority musí mít název');
    if (names.has(name)) fail('invalid', `Úroveň „${name}“ už v tabulce je`);
    if (ids.has(l.id)) fail('invalid', `Úroveň ${l.id} je v tabulce dvakrát`);
    names.add(name);
    ids.add(l.id);
  }
}

/** Uloží tabulku; zkontroluje úrovně kategorií a výjimky materiálů. */
export function putPriorities(model: Model, jp: JoinPriorities): Model {
  const levels = jp.levels.map((l) => ({ id: l.id, name: l.name.trim() }));
  checkLevels(levels);
  const has = (id: Id) => levels.some((l) => l.id === id);
  for (const c of MATERIAL_CATEGORIES)
    if (!has(jp.categoryLevels[c])) fail('invalid', `Kategorie ${c} nemá platnou úroveň priority`);
  for (const m of Object.values(model.materials))
    if (m.joinLevelId !== null && !has(m.joinLevelId))
      fail('invalid', `Materiál „${m.name}“ je v úrovni, která v tabulce není; přesuň ho`);
  return { ...model, joinPriorities: { ...jp, levels } };
}

/** Přiřadí materiálům úroveň (null = podle kategorie); materiál musí existovat. */
export function assignLevels(model: Model, assign: Readonly<Record<Id, Id | null>>): Model {
  const materials = { ...model.materials };
  for (const [id, levelId] of Object.entries(assign)) {
    const m = materials[id] ?? fail('not-found', `Materiál ${id} neexistuje`);
    materials[id] = { ...m, joinLevelId: levelId };
  }
  return { ...model, materials };
}
