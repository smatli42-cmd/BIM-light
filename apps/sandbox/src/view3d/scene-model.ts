// Co se ve 3D ukáže: stěny a desky podle 3D pohledu (View3d z jádra: styl, vrstvy, filtr rekonstrukce,
// pravidla) – skrytá vrstva, filtr fáze i pravidlo „skrýt“ prvek vynechají, otvor skrytý filtrem stěnu
// nevyřízne (stejně jako v půdorysu, plán stěn Z10). Barva a průhlednost povrchu přes funkci grafiky.
// Jen čtení jádra.
import {
  allSlabOpenings,
  allSlabs,
  allWalls,
  categoryState,
  elementFacts,
  openingFacts,
  resolveGraphics,
  slabOpeningFacts,
  type Element,
  type GraphicView,
  type Id,
  type Model,
  type Vec2,
  type View3d,
  type Wall,
} from '@bim-light/core';
import type { Box3D } from './clip.ts';
import { clipTriangles } from './clip-triangles.ts';
import { surfaceSheets, type Sheet } from './surface-sheets.ts';
import { patchLook, patchSolid } from './patches.ts';
import { slabSolids } from './slab-solids.ts';
import { wallSolids, type Solid } from './solids.ts';
import { lookOf, withLook } from './surface.ts';

function isShown(model: Model, view: GraphicView, el: Element): boolean {
  if (el.variant.kind !== 'main') return false;
  if (!categoryState(model.display, view, el.category).visible) return false;
  return resolveGraphics(model.display, view, elementFacts(model, el)).effect.visible;
}

/** Kopie modelu jen se zobrazenými stěnami, jejich napojeními a viditelnými otvory (model se nemění). */
export function shownModel(model: Model, view: GraphicView): { model: Model; walls: Wall[] } {
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
    return (
      resolveGraphics(model.display, view, openingFacts(o)).effect.visible ||
      patchLook(model, view, o, host) !== null
    );
  });
  return { model: { ...model, elements, relations, openings }, walls };
}

/** Barva a průhlednost povrchu prvku z funkce grafiky (pravidlo / styl), jinak materiál. */
const surfaced = (model: Model, view: GraphicView, el: Element, solids: Solid[]): Solid[] =>
  withLook(solids, lookOf(resolveGraphics(model.display, view, elementFacts(model, el)).effect));

/** Obrysy viditelných otvorů v desce (filtr rekonstrukce: skrytý otvor desku neprořízne, jako u stěn). */
function slabHoles(model: Model, view: GraphicView, slabId: Id): Vec2[][] {
  return allSlabOpenings(model)
    .filter(
      (o) =>
        o.hostIds.includes(slabId) &&
        o.variant.kind === 'main' &&
        resolveGraphics(model.display, view, slabOpeningFacts(o)).effect.visible,
    )
    .map((o) => [...o.outline]);
}

/** Záplaty rekonstrukce u otvorů stěny (probourání, zazdívka) jako barevné bloky. */
function patchesOf(model: Model, view: GraphicView, w: Wall): Solid[] {
  return Object.values(model.openings).flatMap((o) => {
    const look = o.hostId === w.id ? patchLook(model, view, o, w) : null;
    const solid = look ? patchSolid(model, o, w, look) : null;
    return solid ? [solid] : [];
  });
}

/**
 * Tělesa modelu pro 3D okno; `only` = jen tyto prvky (Zobrazit výběr ve 3D), null = vše; `storeys` = jen
 * prvky těchto podlaží (rozsah podlaží), null = všechna. Napojení jen mezi zobrazenými stěnami (jako v půdorysu).
 */
export function modelSolids(
  model: Model,
  view: GraphicView,
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
        ...surfaced(model, view, w, wallSolids(shown.model, w)),
        ...patchesOf(shown.model, view, w),
      ]),
    ...slabs.flatMap((d) => surfaced(model, view, d, slabSolids(model, d, slabHoles(model, view, d.id)))),
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

/** Povrchy místností pro 3D okno: na zobrazených stěnách, podle podlaží a výběru, oříznuté kvádrem. */
export function viewSheets(
  model: Model,
  view: View3d,
  only: ReadonlySet<Id> | null,
  box: Box3D | null,
): Sheet[] {
  const walls = new Set(shownModel(model, view).walls.map((w) => w.id));
  const storeys = view.storeyIds ? new Set(view.storeyIds) : null;
  const sheets = surfaceSheets(model, view, { walls, storeys, only });
  if (!box) return sheets;
  return sheets
    .map((x) => ({ ...x, positions: clipTriangles(x.positions, box) }))
    .filter((x) => x.positions.length > 0);
}
