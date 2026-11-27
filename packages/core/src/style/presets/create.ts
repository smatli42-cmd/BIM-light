// Sestaví výchozí nastavení zobrazení projektu z předvoleb (vrstvy, pravidla, kombinace, styly, pera).
import type { Id, IdGenerator } from '../../ids/index.ts';
import { defaultPenTable } from '../pens.ts';
import type { DisplaySettings, Layer, LayerCombination, OverrideCombination, Rule, Style } from '../types.ts';
import {
  BASE_GRAPHICS,
  CATEGORY_GRAPHICS,
  FAR_AREA_GRAPHICS,
  PAPER_SIZES,
  SECTION_LAYER,
  LEVEL_LAYER,
} from './defaults.ts';
import { LAYER_PRESETS } from './layers.ts';
import { COMBO_PRESETS, RULE_PRESETS } from './rules.ts';
import { STYLE_PRESETS, type StylePreset } from './styles.ts';

/** Verze schématu balíčku zobrazení (základ 31). */
export const DISPLAY_SCHEMA_VERSION = 9;

const byId = <T extends { id: Id }>(items: T[]): Record<Id, T> =>
  Object.fromEntries(items.map((i) => [i.id, i]));

function keyMap(keys: readonly string[], newId: IdGenerator): (key: string) => Id {
  const map = new Map(keys.map((k) => [k, newId()]));
  return (key) => {
    const id = map.get(key);
    if (!id) throw new Error(`Předvolba odkazuje na neznámý klíč ${key}`);
    return id;
  };
}

function layerCombination(preset: StylePreset, layers: Layer[], id: Id): LayerCombination {
  const visible = new Set(preset.visibleAnnotations);
  const states = layers.map((l, i) => {
    const key = LAYER_PRESETS[i]?.key ?? '';
    return [l.id, { visible: l.kind === 'category' || visible.has(key), locked: false }] as const;
  });
  return { id, name: preset.name, states: Object.fromEntries(states) };
}

/** Styly z předvoleb; každý dostane vlastní kombinaci vrstev. */
function buildStyles(
  layers: Layer[],
  layerId: (k: string) => Id,
  comboId: (k: string) => Id,
  newId: IdGenerator,
) {
  const layerCombos: LayerCombination[] = [];
  const styles: Style[] = STYLE_PRESETS.map((s) => {
    const combo = layerCombination(s, layers, newId());
    layerCombos.push(combo);
    return {
      id: newId(),
      name: s.name,
      layerCombinationId: combo.id,
      detail: s.detail,
      overrideCombinationId: comboId(s.comboKey),
      categoryGraphics: s.categoryGraphics,
      labels: s.labels,
      defaultScale: s.defaultScale,
      hatchScale: 1,
      defaultAnnotationLayerId: layerId(s.defaultAnnotationKey),
    };
  });
  return { styles, layerCombos };
}

export function createDefaultDisplay(newId: IdGenerator): DisplaySettings {
  const layerId = keyMap(
    LAYER_PRESETS.map((l) => l.key),
    newId,
  );
  const ruleId = keyMap(
    RULE_PRESETS.map((r) => r.key),
    newId,
  );
  const comboId = keyMap(
    COMBO_PRESETS.map((c) => c.key),
    newId,
  );
  const layers: Layer[] = LAYER_PRESETS.map((l) => ({
    id: layerId(l.key),
    name: l.name,
    kind: l.kind,
    categories: l.categories,
  }));
  const rules: Rule[] = RULE_PRESETS.map((r) => ({ id: ruleId(r.key), ...withoutKey(r) }));
  const combos: OverrideCombination[] = COMBO_PRESETS.map((c) => ({
    id: comboId(c.key),
    name: c.name,
    ruleIds: c.ruleKeys.map(ruleId),
    ...(c.phase ? { phase: true } : {}),
  }));
  const { styles, layerCombos } = buildStyles(layers, layerId, comboId, newId);
  return withLevelLayer(
    withSectionLayer({
      schemaVersion: DISPLAY_SCHEMA_VERSION,
      layers: byId(layers),
      layerCombinations: byId(layerCombos),
      rules: byId(rules),
      overrideCombinations: byId(combos),
      styles: byId(styles),
      penTable: defaultPenTable(),
      baseGraphics: BASE_GRAPHICS,
      categoryGraphics: CATEGORY_GRAPHICS,
      paperSizes: PAPER_SIZES,
      farArea: FAR_AREA_GRAPHICS,
      hatches: {},
    }),
  );
}

/**
 * Doplní skupinu anotací „Řezy a pohledy“ (stálé id, aby se nové id ostatních položek neposunula),
 * viditelnou ve všech stylech; i pro migraci starších projektů.
 */
export const withSectionLayer = (d: DisplaySettings): DisplaySettings => withSharedLayer(d, SECTION_LAYER);

/** Doplní skupinu anotací „Výškové kóty“ viditelnou ve všech stylech (i pro migraci). */
export const withLevelLayer = (d: DisplaySettings): DisplaySettings => withSharedLayer(d, LEVEL_LAYER);

function withSharedLayer(d: DisplaySettings, preset: { id: string; name: string }): DisplaySettings {
  if (d.layers[preset.id]) return d;
  const layer: Layer = { ...preset, kind: 'annotation', categories: [] };
  const combos = Object.fromEntries(
    Object.values(d.layerCombinations).map((c) => [
      c.id,
      { ...c, states: { ...c.states, [layer.id]: { visible: true, locked: false } } },
    ]),
  );
  return { ...d, layers: { ...d.layers, [layer.id]: layer }, layerCombinations: combos };
}

function withoutKey<T extends { key: string }>(item: T): Omit<T, 'key'> {
  const { key: _key, ...rest } = item;
  return rest;
}
