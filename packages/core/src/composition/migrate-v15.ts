// Migrace projektu 15 → 16 (krok 3 editoru typů): skladby jako samostatné položky. Každý pás typu stěny
// dostane odkaz na skladbu; typy se stejnými vrstvami dostanou jednu společnou skladbu.
import type { Model } from '../model/types.ts';
import { ensureCompositions } from './store.ts';

type Obj = Record<string, unknown>;

export function projectV15toV16(data: Obj): Obj {
  const m = { ...data, compositions: data['compositions'] ?? {} } as unknown as Model;
  return ensureCompositions(m) as unknown as Obj;
}
