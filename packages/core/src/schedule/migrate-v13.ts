// Migrace projektu 13 → 14 (plán stěn Z8): typy stěn dostanou značku (S1, S2… v pořadí typů) a projekt
// výchozí výkazy (výkaz stěn, výkaz materiálů, legenda skladeb).
import { defaultSchedules } from './defaults.ts';

type Obj = Record<string, unknown>;

export function projectV13toV14(data: Obj): Obj {
  const types = Object.entries((data['wallTypes'] ?? {}) as Record<string, Obj>);
  const marked = types.map(([id, t], i) => [id, { ...t, mark: t['mark'] ?? `S${i + 1}` }]);
  return {
    ...data,
    wallTypes: Object.fromEntries(marked),
    schedules: data['schedules'] ?? defaultSchedules(),
  };
}
