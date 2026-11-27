// Co se ve 3D ukáže: stěny a desky všech podlaží (nebo jen vybrané, F4) podle stylu a filtru rekonstrukce
// aktivního pohledu – skrytá vrstva (kategorie), filtr fáze i pravidlo „skrýt“ prvek ve 3D vynechají,
// otvor skrytý filtrem stěnu nevyřízne (stejně jako v půdorysu, plán stěn Z10). Jen čtení jádra.
import {
  allSlabOpenings,
  allSlabs,
  allWalls,
  categoryState,
  elementFacts,
  openingFacts,
  resolveGraphics,
  type Id,
  type Model,
  type Element,
  slabOpeningFacts,
  type Vec2,
  type View,
  type Wall,
} from '@bim-light/core';
import { patchColor, patchSolid } from './patches.ts';
import { slabSolids } from './slab-solids.ts';
import { wallSolids, type Solid } from './solids.ts';

/** Pohled aktivního okna přenesený na jiné podlaží (styl, vrstvy a filtr zůstávají). */
const onStorey = (view: View, storeyId: Id): View =>
  storeyId === view.storeyId ? view : { ...view, id: `${view.id}@3d@${storeyId}`, storeyId };

function isShown(model: Model, view: View, w: Element): boolean {
  if (w.variant.kind !== 'main') return false;
  const v = onStorey(view, w.storeyId);
  if (!categoryState(model.display, v, w.category).visible) return false;
  return resolveGraphics(model.display, v, elementFacts(model, w)).effect.visible;
}

/** Kopie modelu jen se zobrazenými stěnami, jejich napojeními a viditelnými otvory (model se nemění). */
export function shownModel(model: Model, view: View): { model: Model; walls: Wall[] } {
  const walls = allWalls(model).filter((w) => isShown(model, view, w));
  const keep = new Set(walls.map((w) => w.id));
  const pick = <T>(rec: Readonly<Record<Id, T>>, ok: (x: T) => boolean) =>
    Object.fromEntries(Object.entries(rec).filter(([, x]) => ok(x))) as Record<Id, T>;
  const elements = pick(model.elements, (e) => e.category !== 'wall' || keep.has(e.id));
  const relations = pick(
    model.relations,
    (r) => r.kind !== 'wall-connection' || (keep.has(r.relating.wallId) && keep.has(r.related.wallId)),
  );
  // Otvor vyřízne stěnu, když je vidět, nebo když má barevnou záplatu (probourání v Bouracích pracích).
  const openings = pick(model.openings, (o) => {
    const host = model.elements[o.hostId];
    if (!keep.has(o.hostId) || host?.category !== 'wall') return false;
    const v = onStorey(view, o.storeyId);
    return (
      resolveGraphics(model.display, v, openingFacts(o)).effect.visible ||
      patchColor(model, v, o, host) !== null
    );
  });
  return { model: { ...model, elements, relations, openings }, walls };
}

/**
 * Barva povrchu ve 3D přes funkci grafiky (základy 11, 30): pravidlo nebo styl s `surfaceColor` přebarví
 * všechny vrstvy prvku (např. bourání žlutě), jinak zůstane barva materiálu.
 */
function withSurface(model: Model, view: View, el: Element, solids: Solid[]): Solid[] {
  const v = onStorey(view, el.storeyId);
  const color = resolveGraphics(model.display, v, elementFacts(model, el)).effect.surfaceColor;
  return color ? solids.map((x) => ({ ...x, color })) : solids;
}

/** Obrysy viditelných otvorů v desce (filtr rekonstrukce: skrytý otvor desku neprořízne, jako u stěn). */
function slabHoles(model: Model, view: View, slabId: Id): Vec2[][] {
  return allSlabOpenings(model)
    .filter(
      (o) =>
        o.hostIds.includes(slabId) &&
        o.variant.kind === 'main' &&
        resolveGraphics(model.display, onStorey(view, o.storeyId), slabOpeningFacts(o)).effect.visible,
    )
    .map((o) => [...o.outline]);
}

/** Záplaty rekonstrukce u otvorů stěny (probourání, zazdívka) jako barevné bloky. */
function patchesOf(model: Model, view: View, w: Wall): Solid[] {
  const v = onStorey(view, w.storeyId);
  return Object.values(model.openings).flatMap((o) => {
    const color = o.hostId === w.id ? patchColor(model, v, o, w) : null;
    const solid = color ? patchSolid(model, o, w, color) : null;
    return solid ? [solid] : [];
  });
}

/**
 * Tělesa modelu pro 3D okno; `only` = jen tyto prvky (Zobrazit výběr ve 3D), null = vše; `storeys` = jen
 * prvky těchto podlaží (rozsah podlaží), null = všechna. Napojení jen mezi zobrazenými stěnami (jako v půdorysu).
 */
export function modelSolids(
  model: Model,
  view: View,
  only: ReadonlySet<Id> | null = null,
  storeys: ReadonlySet<Id> | null = null,
): Solid[] {
  const shown = shownModel(model, view);
  const want = (e: Element) => (!only || only.has(e.id)) && (!storeys || storeys.has(e.storeyId));
  const slabs = allSlabs(model).filter((d) => want(d) && isShown(model, view, d));
  return [
    ...shown.walls
      .filter(want)
      .flatMap((w) => [
        ...withSurface(model, view, w, wallSolids(shown.model, w)),
        ...patchesOf(shown.model, view, w),
      ]),
    ...slabs.flatMap((d) => withSurface(model, view, d, slabSolids(model, d, slabHoles(model, view, d.id)))),
  ];
}

/** Prvky pro „Zobrazit výběr ve 3D“: vybrané stěny a desky a hostitelé vybraných otvorů (i v deskách). */
export function selectionElements(
  model: Model,
  walls: readonly Id[],
  openings: readonly Id[],
  slabs: readonly Id[] = [],
  slabOpenings: readonly Id[] = [],
): Set<Id> {
  const hosts = openings.map((id) => model.openings[id]?.hostId).filter((x): x is Id => !!x);
  const slabHosts = slabOpenings.flatMap((id) => model.slabOpenings[id]?.hostIds ?? []);
  return new Set([...walls, ...hosts, ...slabs, ...slabHosts]);
}
