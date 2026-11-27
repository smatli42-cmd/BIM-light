// Funkce grafiky (základ 11): jedno místo, pevné pořadí 6 pater přepisů, vyšší patro vyhrává.
// Vrací výslednou grafiku i „proč“ (které patro a které pravidlo rozhodlo o každé vlastnosti).
// Generátory nikdy nevolí barvu, čáru ani šrafu samy.
import type { GraphicView } from '../view/types.ts';
import { matches, type ElementFacts } from './conditions.ts';
import type { DisplaySettings, GraphicEffect, ResolvedEffect } from './types.ts';

export type Level = 1 | 2 | 3 | 4 | 5 | 6;

export const LEVEL_NAMES: Readonly<Record<Level, string>> = {
  1: 'materiál a kategorie',
  2: 'styl',
  3: 'pravidla',
  4: 'úprava pohledu',
  5: 'přepis prvku ve všech pohledech',
  6: 'přepis prvku v tomto pohledu',
};

export interface Reason {
  readonly level: Level;
  readonly levelName: string;
  /** Co přesně rozhodlo: název kategorie, stylu, pravidla… */
  readonly source: string;
}

export interface GraphicsResult {
  readonly effect: ResolvedEffect;
  readonly why: Readonly<Record<keyof ResolvedEffect, Reason>>;
}

interface Layer {
  readonly level: Level;
  readonly source: string;
  readonly effect: GraphicEffect | undefined;
}

/** Pravidla z kombinace přepisů, která na prvek platí; první v seznamu má přednost. */
function ruleLayers(display: DisplaySettings, comboId: string, facts: ElementFacts): Layer[] {
  const combo = display.overrideCombinations[comboId];
  if (!combo) return [];
  const out: Layer[] = [];
  for (const id of [...combo.ruleIds].reverse()) {
    const rule = display.rules[id];
    if (!rule || rule.disabled) continue;
    if (rule.conditions.every((c) => matches(c, facts)))
      out.push({ level: 3, source: rule.name, effect: rule.effect });
  }
  return out;
}

/** Všechna patra od nejnižšího po nejvyšší. */
function layersFor(display: DisplaySettings, view: GraphicView, facts: ElementFacts): Layer[] {
  const style = display.styles[view.styleId];
  const cat = facts.category;
  const comboId = view.local.overrideCombinationId ?? style?.overrideCombinationId ?? '';
  return [
    { level: 1, source: `kategorie ${cat}`, effect: display.categoryGraphics[cat] },
    { level: 1, source: 'kategorie místnosti', effect: facts.ownDefault },
    { level: 2, source: `styl ${style?.name ?? '?'}`, effect: style?.categoryGraphics[cat] },
    ...ruleLayers(display, comboId, facts),
    // Filtr rekonstrukce (fáze) má přednost před grafickými přepisy, oba jsou patro pravidel.
    ...ruleLayers(display, view.phaseFilterId ?? '', facts),
    { level: 4, source: 'vzdálená oblast řezu', effect: facts.zoneEffect },
    { level: 4, source: `pohled ${view.name}`, effect: view.local.categoryGraphics?.[cat] },
    { level: 5, source: 'přepis prvku', effect: facts.graphicOverride },
    { level: 6, source: `přepis prvku v pohledu ${view.name}`, effect: view.elementOverrides[facts.id] },
  ];
}

/** Výsledná grafika prvku v pohledu a důvod pro každou vlastnost. */
export function resolveGraphics(
  display: DisplaySettings,
  view: GraphicView,
  facts: ElementFacts,
): GraphicsResult {
  const effect: Record<string, unknown> = { ...display.baseGraphics };
  const base: Reason = { level: 1, levelName: LEVEL_NAMES[1], source: 'výchozí grafika projektu' };
  const why: Record<string, Reason> = Object.fromEntries(Object.keys(effect).map((k) => [k, base]));
  for (const layer of layersFor(display, view, facts)) {
    for (const [key, value] of Object.entries(layer.effect ?? {})) {
      if (value === undefined || !(key in effect)) continue;
      effect[key] = value;
      why[key] = { level: layer.level, levelName: LEVEL_NAMES[layer.level], source: layer.source };
    }
  }
  return { effect: effect as ResolvedEffect, why: why as GraphicsResult['why'] };
}
