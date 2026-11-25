// Pracovní okno podlaží a uložené pohledy (koncepce rozhraní, část 4): pracovní okno je pohled s
// `saved: false` (jeden na podlaží), uložené pohledy jdou na výkresy.
import type { Id } from '../ids/index.ts';
import type { Model } from '../model/types.ts';
import type { View } from './types.ts';

/** Pracovní okno podlaží, nebo null (starý projekt bez něj). */
export const workingViewOf = (m: Model, storeyId: Id): View | null =>
  Object.values(m.views).find((v) => v.storeyId === storeyId && !v.saved) ?? null;

/** Uložené pohledy (případně jen jednoho stylu = sady). */
export const savedViews = (m: Model, styleId?: Id): View[] =>
  Object.values(m.views).filter((v) => v.saved && (styleId === undefined || v.styleId === styleId));

/** Název, který v projektu ještě není („Půdorys 1.NP“, „Půdorys 1.NP (2)“…). */
export function freeViewName(m: Model, base: string): string {
  const names = new Set(Object.values(m.views).map((v) => v.name));
  if (!names.has(base)) return base;
  for (let i = 2; ; i++) if (!names.has(`${base} (${i})`)) return `${base} (${i})`;
}
