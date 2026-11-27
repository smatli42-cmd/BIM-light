// Sada zobrazení Elektro (koncepce 4, katalog pohledů: tabulka Studie / Projekt / Elektro): vrstva Elektro,
// skupina anotací elektro, pravidlo „Elektro – stavba šedě“, kombinace přepisů „Elektro – podklad šedě“
// a styl Elektro 1:50. Ve Studii a Projektu je vrstva Elektro skrytá. Stálá id → i pro migraci.
import type { DisplaySettings, Layer, LayerCombination, Rule, Style } from '../style/types.ts';
import { DEFAULT_ELECTRO_TEXT, DEFAULT_SYMBOL_SIZE } from './types.ts';

export const ELECTRO_DISPLAY = {
  layer: 'layer-electro',
  annotations: 'ann-electro',
  rule: 'rule-electro-grey',
  combo: 'combo-electro',
  layerCombination: 'lc-electro',
  style: 'style-electro',
} as const;
const E = ELECTRO_DISPLAY;

/** Šedá podkladu (stavba v Elektru): čáry, výplň řezu bez šraf. */
export const ELECTRO_BASE_GREY = { lineColor: '#9a9a9a', fillColor: '#ececec' } as const;

/** Pravidlo grafiky: vše kromě elektra a místností šedě, bez šraf, slabší obrys řezu. */
const RULE: Rule = {
  id: E.rule,
  name: 'Elektro – stavba šedě',
  conditions: [
    { property: 'discipline', op: 'neq', value: 'electrical' },
    { property: 'category', op: 'neq', value: 'room' },
  ],
  effect: { ...ELECTRO_BASE_GREY, hatch: 'none', cutPen: 3 },
};

/** Viditelné skupiny anotací v Elektru: kresba 2D, elektro a společné (řezy, výškové kóty). */
function electroCombination(d: DisplaySettings, layers: Record<string, Layer>): LayerCombination {
  const shared = new Set<string>([E.annotations, 'ann-sections', 'ann-levels']);
  const states = Object.values(layers).map((l) => {
    const visible = l.kind === 'category' || shared.has(l.id) || l.name === 'Kresba 2D';
    return [l.id, { visible, locked: false }] as const;
  });
  return { id: E.layerCombination, name: 'Elektro', states: Object.fromEntries(states) };
}

const STYLE: Style = {
  id: E.style,
  name: 'Elektro',
  layerCombinationId: E.layerCombination,
  detail: 'medium',
  overrideCombinationId: E.combo,
  categoryGraphics: {},
  labels: {
    roomNumber: true,
    roomName: true,
    roomArea: false,
    elevations: true,
    electroMarks: true,
    electroHeights: true,
  },
  tileJoints: false,
  defaultScale: 50,
  hatchScale: 1,
  defaultAnnotationLayerId: E.annotations,
};

/** Doplní sadu Elektro (nový projekt i migrace); co už v nastavení je, nechá být. */
export function withElectroDisplay(d: DisplaySettings): DisplaySettings {
  if (d.layers[E.layer]) return d;
  const layers: Record<string, Layer> = {
    ...d.layers,
    [E.layer]: { id: E.layer, name: 'Elektro', kind: 'category', categories: ['electrical'] },
    [E.annotations]: {
      id: E.annotations,
      name: 'Kóty a popisky – elektro',
      kind: 'annotation',
      categories: [],
    },
  };
  const hidden = { visible: false, locked: false };
  const combos = Object.fromEntries(
    Object.values(d.layerCombinations).map((c) => [
      c.id,
      { ...c, states: { ...c.states, [E.layer]: hidden, [E.annotations]: hidden } },
    ]),
  );
  const cg = d.categoryGraphics;
  return {
    ...d,
    layers,
    layerCombinations: { ...combos, [E.layerCombination]: electroCombination(d, layers) },
    rules: { ...d.rules, [E.rule]: RULE },
    overrideCombinations: {
      ...d.overrideCombinations,
      [E.combo]: { id: E.combo, name: 'Elektro – podklad šedě', ruleIds: [E.rule] },
    },
    styles: { ...d.styles, [E.style]: STYLE },
    categoryGraphics: { ...cg, electrical: cg.electrical ?? { projectionPen: 2, cutPen: 2 } },
    paperSizes: {
      ...d.paperSizes,
      electroSymbol: d.paperSizes.electroSymbol ?? DEFAULT_SYMBOL_SIZE,
      electroText: d.paperSizes.electroText ?? DEFAULT_ELECTRO_TEXT,
    },
  };
}
