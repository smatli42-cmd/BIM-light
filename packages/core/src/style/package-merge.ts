// Sloučení importovaného balíčku zobrazení s projektem (katalog pohledů: Import a export).
// Při shodě názvů: nahradit (zachová id, pohledy dál fungují), nebo ponechat obě (nové id, název „(2)“).
import type { Id, IdGenerator } from '../ids/index.ts';
import type { DisplaySettings, LayerCombination, OverrideCombination, Style } from './types.ts';

export type ImportMode = 'replace' | 'keep-both';

type Named = { readonly id: Id; readonly name: string };
type CollectionKey = 'layers' | 'layerCombinations' | 'rules' | 'overrideCombinations' | 'styles';
const KEYS: CollectionKey[] = ['layers', 'layerCombinations', 'rules', 'overrideCombinations', 'styles'];

export type ImportPreview = Readonly<
  Record<CollectionKey, { readonly add: number; readonly replace: number }>
>;

const byName = (rec: Readonly<Record<Id, Named>>, name: string) =>
  Object.values(rec).find((x) => x.name === name);

/** Náhled importu: kolik položek přibude a kolik se nahradí (při režimu „nahradit“). */
export function previewImport(current: DisplaySettings, incoming: DisplaySettings): ImportPreview {
  const entries = KEYS.map((key) => {
    const items = Object.values(incoming[key] as Record<Id, Named>);
    const replace = items.filter((i) => byName(current[key] as Record<Id, Named>, i.name)).length;
    return [key, { add: items.length - replace, replace }] as const;
  });
  return Object.fromEntries(entries) as ImportPreview;
}

function planIds(current: DisplaySettings, incoming: DisplaySettings, mode: ImportMode, newId: IdGenerator) {
  const idMap = new Map<Id, Id>();
  const names = new Map<Id, string>();
  for (const key of KEYS) {
    const existing = current[key] as Record<Id, Named>;
    for (const item of Object.values(incoming[key] as Record<Id, Named>)) {
      const same = byName(existing, item.name);
      if (same && mode === 'replace') idMap.set(item.id, same.id);
      else idMap.set(item.id, existing[item.id] ? newId() : item.id);
      names.set(item.id, same && mode === 'keep-both' ? `${item.name} (2)` : item.name);
    }
  }
  return { idMap, names };
}

function mergeInto<T extends Named>(
  current: DisplaySettings,
  incoming: DisplaySettings,
  key: CollectionKey,
  fn: (x: T) => T,
): Record<Id, T> {
  const out = { ...(current[key] as unknown as Record<Id, T>) };
  for (const item of Object.values(incoming[key] as unknown as Record<Id, T>)) {
    const mapped = fn(item);
    out[mapped.id] = mapped;
  }
  return out;
}

/** Sloučí balíček do nastavení projektu. */
export function mergeDisplay(
  current: DisplaySettings,
  incoming: DisplaySettings,
  mode: ImportMode,
  newId: IdGenerator,
): DisplaySettings {
  const { idMap, names } = planIds(current, incoming, mode, newId);
  const id = (x: Id) => idMap.get(x) ?? x;
  const base = <T extends Named>(item: T): T => ({
    ...item,
    id: id(item.id),
    name: names.get(item.id) ?? item.name,
  });
  const remap = {
    layerCombinations: (c: LayerCombination): LayerCombination => ({
      ...base(c),
      states: Object.fromEntries(Object.entries(c.states).map(([k, v]) => [id(k), v])),
    }),
    overrideCombinations: (c: OverrideCombination): OverrideCombination => ({
      ...base(c),
      ruleIds: c.ruleIds.map(id),
    }),
    styles: (s: Style): Style => ({
      ...base(s),
      layerCombinationId: id(s.layerCombinationId),
      overrideCombinationId: id(s.overrideCombinationId),
      defaultAnnotationLayerId: id(s.defaultAnnotationLayerId),
    }),
  };
  const merge = <T extends Named>(key: CollectionKey, fn: (x: T) => T) =>
    mergeInto(current, incoming, key, fn);
  const globals = mode === 'replace' ? incoming : current;
  return {
    ...current,
    layers: merge('layers', base),
    rules: merge('rules', base),
    layerCombinations: merge('layerCombinations', remap.layerCombinations),
    overrideCombinations: merge('overrideCombinations', remap.overrideCombinations),
    styles: merge('styles', remap.styles),
    penTable: globals.penTable,
    baseGraphics: globals.baseGraphics,
    categoryGraphics: globals.categoryGraphics,
    paperSizes: globals.paperSizes,
    // Šrafy mají stabilní id (slug): „nahradit“ vezme importované, „ponechat obě“ nechá projektové.
    hatches:
      mode === 'replace'
        ? { ...current.hatches, ...incoming.hatches }
        : { ...incoming.hatches, ...current.hatches },
  };
}
