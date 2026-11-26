// Stěny skryté v pohledu (vrstva, filtr rekonstrukce, pravidlo „skrýt“) se v kresbě nenapojují
// (pokyn uživatele 2026-11-26: plánovaný stav bez mezery po bourané příčce; jako v Archicadu se
// napojení počítá jen mezi zobrazenými prvky). Stejně otvor skrytý filtrem rekonstrukce stěnu nevyřízne
// (plán stěn Z10: probourání = nový otvor, ve stávajícím stavu stěna celá; zazdívka = bouraný otvor,
// v plánovaném stavu stěna celá). Model se nemění – kresba počítá z jeho kopie.
import type { Id } from '../ids/index.ts';
import type { Model } from '../model/types.ts';
import { removeElements, removeOpenings, removeRelations } from '../model/update.ts';
import { openingFacts } from '../opening/draw.ts';
import { elementFacts } from '../style/conditions.ts';
import { resolveGraphics } from '../style/graphics.ts';
import type { ResolvedEffect } from '../style/types.ts';
import { allWalls } from '../wall/queries.ts';
import type { Wall } from '../wall/types.ts';
import { categoryState } from './effective.ts';
import type { View } from './types.ts';

export interface VisibleWalls {
  /** Viditelné stěny podlaží pohledu s výslednou grafikou. */
  readonly shown: readonly { readonly wall: Wall; readonly g: ResolvedEffect }[];
  /** Model bez skrytých stěn a jejich napojení (pro geometrii kresby). */
  readonly model: Model;
  readonly hidden: ReadonlySet<Id>;
}

const cache = new WeakMap<Model, Map<string, VisibleWalls>>();

/** Kopie modelu bez otvorů, které funkce grafiky v pohledu skryje (filtr rekonstrukce, pravidlo). */
function withoutHiddenOpenings(model: Model, view: View): Model {
  const gone = Object.values(model.openings).filter(
    (o) =>
      o.storeyId === view.storeyId && !resolveGraphics(model.display, view, openingFacts(o)).effect.visible,
  );
  return gone.length
    ? removeOpenings(
        model,
        gone.map((o) => o.id),
      )
    : model;
}

export function visibleWalls(model: Model, view: View): VisibleWalls {
  const key = `${view.id}|${JSON.stringify(view.local)}|${view.styleId}|${view.phaseFilterId}`;
  const hit = cache.get(model)?.get(key);
  if (hit) return hit;
  const shown: { wall: Wall; g: ResolvedEffect }[] = [];
  const hidden = new Set<Id>();
  for (const w of allWalls(model)) {
    if (w.storeyId !== view.storeyId || w.variant.kind !== 'main') continue;
    const g = resolveGraphics(model.display, view, elementFacts(model, w)).effect;
    if (categoryState(model.display, view, w.category).visible && g.visible) shown.push({ wall: w, g });
    else hidden.add(w.id);
  }
  const rels = Object.values(model.relations)
    .filter(
      (r) => r.kind === 'wall-connection' && (hidden.has(r.relating.wallId) || hidden.has(r.related.wallId)),
    )
    .map((r) => r.id);
  const withWalls = hidden.size ? removeRelations(removeElements(model, hidden), rels) : model;
  const m = withoutHiddenOpenings(withWalls, view);
  const out = { shown, model: m, hidden };
  const byView = cache.get(model) ?? new Map<string, VisibleWalls>();
  byView.set(key, out);
  cache.set(model, byView);
  return out;
}
