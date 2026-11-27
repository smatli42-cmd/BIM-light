// Co se ve 3D ukáže: stěny a desky všech podlaží (nebo jen vybrané, F4) podle stylu a filtru rekonstrukce
// aktivního pohledu – skrytá vrstva (kategorie), filtr fáze i pravidlo „skrýt“ prvek ve 3D vynechají,
// otvor skrytý filtrem stěnu nevyřízne (stejně jako v půdorysu, plán stěn Z10). Jen čtení jádra.
import {
  allSlabs,
  allWalls,
  categoryState,
  elementFacts,
  openingFacts,
  resolveGraphics,
  type Id,
  type Model,
  type Element,
  type View,
  type Wall,
} from '@bim-light/core';
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
  const openings = pick(
    model.openings,
    (o) =>
      keep.has(o.hostId) &&
      resolveGraphics(model.display, onStorey(view, o.storeyId), openingFacts(o)).effect.visible,
  );
  return { model: { ...model, elements, relations, openings }, walls };
}

/**
 * Tělesa modelu pro 3D okno; `only` = jen tyto prvky (Zobrazit výběr ve 3D), null = vše.
 * Napojení se počítá jen mezi zobrazenými stěnami (jako v půdorysu).
 */
export function modelSolids(model: Model, view: View, only: ReadonlySet<Id> | null = null): Solid[] {
  const shown = shownModel(model, view);
  const want = (id: Id) => !only || only.has(id);
  const slabs = allSlabs(model).filter((d) => want(d.id) && isShown(model, view, d));
  return [
    ...shown.walls.filter((w) => want(w.id)).flatMap((w) => wallSolids(shown.model, w)),
    ...slabs.flatMap((d) => slabSolids(model, d)),
  ];
}

/** Prvky pro „Zobrazit výběr ve 3D“: vybrané stěny a desky a hostitelé vybraných otvorů. */
export function selectionElements(
  model: Model,
  walls: readonly Id[],
  openings: readonly Id[],
  slabs: readonly Id[] = [],
): Set<Id> {
  const hosts = openings.map((id) => model.openings[id]?.hostId).filter((x): x is Id => !!x);
  return new Set([...walls, ...hosts, ...slabs]);
}
