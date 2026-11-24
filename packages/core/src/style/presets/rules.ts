// Předdefinovaná pravidla grafiky (základ 30). Fáze jsou jen pravidla ve stejném mechanismu (rozhodnutí 6).
// Žádné není v kódu zvláštní; jdou kopírovat a upravovat.
import type { GraphicEffect, Predicate } from '../types.ts';

export interface RulePreset {
  readonly key: string;
  readonly name: string;
  readonly conditions: readonly Predicate[];
  readonly effect: GraphicEffect;
}

const status = (value: string): Predicate => ({ property: 'status', op: 'eq', value });

export const RULE_PRESETS: readonly RulePreset[] = [
  {
    key: 'existing-black',
    name: 'Stávající černě',
    conditions: [status('existing')],
    effect: { lineColor: '#000000' },
  },
  {
    key: 'demolished-yellow',
    name: 'Bourání žlutě čárkovaně',
    conditions: [status('demolished')],
    effect: { lineColor: '#d4a800', lineType: 'dashed', fillColor: '#fff3b0', hatch: 'none' },
  },
  { key: 'new-red', name: 'Nové červeně', conditions: [status('new')], effect: { lineColor: '#c62828' } },
  { key: 'hide-new', name: 'Skrýt nové', conditions: [status('new')], effect: { visible: false } },
  {
    key: 'hide-demolished',
    name: 'Skrýt bourané',
    conditions: [status('demolished')],
    effect: { visible: false },
  },
];

export interface ComboPreset {
  readonly key: string;
  readonly name: string;
  readonly ruleKeys: readonly string[];
}

/** Kombinace přepisů; první pravidlo v seznamu má přednost. */
export const COMBO_PRESETS: readonly ComboPreset[] = [
  { key: 'none', name: 'Bez přepisů', ruleKeys: [] },
  { key: 'phase-existing', name: 'Fáze – stávající stav', ruleKeys: ['hide-new'] },
  {
    key: 'phase-demolition',
    name: 'Fáze – bourací práce',
    ruleKeys: ['hide-new', 'demolished-yellow', 'existing-black'],
  },
  { key: 'phase-new', name: 'Fáze – nový stav', ruleKeys: ['hide-demolished'] },
  { key: 'phase-compare', name: 'Fáze – srovnávací', ruleKeys: ['demolished-yellow', 'new-red'] },
];
