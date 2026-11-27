// Migrace projektu 37 → 38: elektro podle legendy uživatele – skupina Stínění, názvy a barvy skupin
// z legendy; typy z vestavěné knihovny verze 1 (neupravené, zatím bez editoru) se nahradí verzí 2
// (výšky, skupiny a popisy z legendy) se stejným id. Vlastní typy a prvky zůstanou beze změny.
import { DEFAULT_ELECTRO_GROUPS } from './groups.ts';
import { electroLibraryTypes } from './library.ts';
import type { ElectroGroup, ElectroType } from './types.ts';

type Obj = Record<string, unknown>;

export function projectV37toV38(data: Obj): Obj {
  const groups = (data['electroGroups'] ?? {}) as Record<string, ElectroGroup>;
  const types = (data['electroTypes'] ?? {}) as Record<string, ElectroType>;
  const library = electroLibraryTypes();
  const electroTypes = Object.fromEntries(
    Object.entries(types).map(([id, t]) => {
      const fresh = library[id];
      return [id, fresh && t.source?.version === 1 ? fresh : t];
    }),
  );
  const defaults = Object.fromEntries(DEFAULT_ELECTRO_GROUPS.map((g) => [g.id, g]));
  return { ...data, electroGroups: { ...groups, ...defaults }, electroTypes };
}
