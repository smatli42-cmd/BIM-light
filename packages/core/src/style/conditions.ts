// Podmínky pravidel grafiky (základ 30): ptají se na vlastnosti prvku.
import type { Id } from '../ids/index.ts';
import type { Category } from '../model/categories.ts';
import type { Element, VariantRef } from '../model/types.ts';
import type { Model } from '../model/types.ts';
import { elementLayers } from '../model/layers.ts';
import type { GraphicEffect, Predicate } from './types.ts';

/** Vlastnosti prvku, na které se pravidlo smí ptát (rozšíří se s popisem parametrů, základ 15b). */
export const RULE_PROPERTIES = [
  'category',
  'discipline',
  'status',
  'variant',
  'typeId',
  'materialId',
] as const;
export type RuleProperty = (typeof RULE_PROPERTIES)[number];

/** Fakta o prvku pro funkci grafiky (prvek i anotace). */
export interface ElementFacts {
  readonly id: Id;
  readonly category: Category;
  readonly discipline: string;
  readonly status: string;
  /** „main“ nebo „sada/varianta“. */
  readonly variant: string;
  readonly typeId: Id;
  readonly materialIds: readonly Id[];
  readonly graphicOverride?: GraphicEffect;
}

export const variantKey = (v: VariantRef): string =>
  v.kind === 'main' ? 'main' : `${v.setId}/${v.variantId}`;

/** Fakta o BIM prvku. */
export function elementFacts(model: Model, el: Element): ElementFacts {
  const materialIds = [...new Set(elementLayers(model, el).map((l) => l.materialId))];
  const facts = {
    id: el.id,
    category: el.category,
    discipline: el.discipline,
    status: el.status,
    variant: variantKey(el.variant),
    typeId: el.typeId,
    materialIds,
  };
  return el.graphicOverride ? { ...facts, graphicOverride: el.graphicOverride } : facts;
}

export const isKnownProperty = (p: string): p is RuleProperty =>
  (RULE_PROPERTIES as readonly string[]).includes(p);

function valuesOf(facts: ElementFacts, property: RuleProperty): (string | number)[] {
  return property === 'materialId' ? [...facts.materialIds] : [facts[property]];
}

/** Platí podmínka pro prvek? Neznámá vlastnost = neplatí. */
export function matches(pred: Predicate, facts: ElementFacts): boolean {
  if (!isKnownProperty(pred.property)) return false;
  const have = valuesOf(facts, pred.property);
  const want = Array.isArray(pred.value) ? pred.value : [pred.value];
  const hit = have.some((h) => want.includes(h as never));
  if (pred.op === 'neq') return !hit;
  return hit;
}
