// Migrace projektu 43 → 44: číselná priorita protínání materiálu (joinPriority 0–999) → tabulka úrovní
// (pokyn uživatele 2026-11-28). Každé dosavadní číslo dostane svou úroveň (výchozí úrovně mají „své“ číslo,
// cizí číslo přidá úroveň „Priorita N“ na správné místo), takže pořadí i shody zůstanou a výsledek spojů
// se nezmění. Materiál v úrovni své kategorie dostane joinLevelId null (podle kategorie).
import type { MaterialCategory } from '../material/types.ts';
import { DEFAULT_CATEGORY_LEVELS, DEFAULT_JOIN_LEVELS, DEFAULT_JOIN_POLICY } from './types.ts';

type Obj = Record<string, unknown>;

interface Level {
  readonly id: string;
  readonly name: string;
  readonly value: number;
}

function levelsFor(values: readonly number[]): Level[] {
  const levels: Level[] = DEFAULT_JOIN_LEVELS.map((l) => ({ id: l.id, name: l.name, value: l.legacy }));
  for (const v of values)
    if (!levels.some((l) => l.value === v))
      levels.push({ id: `join-p${v}`, name: `Priorita ${v}`, value: v });
  return levels.sort((a, b) => b.value - a.value);
}

const numberOf = (m: Obj): number | undefined =>
  typeof m['joinPriority'] === 'number' ? m['joinPriority'] : undefined;

/** Materiál z knihovny přidaný starší migrací (střechy, povrchy) už nese joinLevelId; zůstane mu. */
function migrated(m: Obj, levels: readonly Level[]): Obj {
  const { joinPriority: _p, ...rest } = m;
  const value = numberOf(m);
  if (value === undefined) return { ...rest, joinLevelId: m['joinLevelId'] ?? null };
  const level = levels.find((l) => l.value === value);
  const byCategory = DEFAULT_CATEGORY_LEVELS[m['category'] as MaterialCategory];
  return { ...rest, joinLevelId: level && level.id !== byCategory ? level.id : null };
}

export function projectV43toV44(data: Obj): Obj {
  const mats = (data['materials'] ?? {}) as Record<string, Obj>;
  const values = Object.values(mats).flatMap((m) => numberOf(m) ?? []);
  const levels = levelsFor([...new Set(values)]);
  const materials = Object.fromEntries(Object.entries(mats).map(([id, m]) => [id, migrated(m, levels)]));
  return {
    ...data,
    materials,
    joinPriorities: {
      levels: levels.map(({ id, name }) => ({ id, name })),
      categoryLevels: { ...DEFAULT_CATEGORY_LEVELS },
      policy: DEFAULT_JOIN_POLICY,
    },
  };
}
