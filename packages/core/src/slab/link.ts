// Vazba obrysu desky (základy 14, 16, 24; Revit podlaha z hranice místnosti / „Vybrat stěny“, Archicad
// deska podle stěn): obrys se po každém příkazu přepočítá z místnosti nebo stěn. Deska si drží poslední
// spočítaný obrys, aby ho kresba, 3D, IFC i výkazy četly stejně jako u ruční desky. Ruční úprava obrysu
// (obrys změněný příkazem při nezměněné vazbě) vazbu zamkne a přepočet ji pak nechá být, dokud uživatel
// vazbu příkazem neobnoví.
import { dist, type Vec2 } from '../geometry/index.ts';
import type { Model } from '../model/types.ts';
import { putElements, removeDimensions } from '../model/update.ts';
import { dimensionOutlineIds, pruneOutlineDimensions } from '../dimension/outline-ref.ts';
import { roomFloorShape } from '../room/floor.ts';
import { roomGeometry } from '../room/geometry.ts';
import { findWall } from '../wall/queries.ts';
import { outlineFromWalls } from './from-walls.ts';
import { normalizeOutline, outlineError } from './geometry.ts';
import { allSlabs } from './queries.ts';
import type { Slab, SlabLink } from './types.ts';

export interface SlabShape {
  readonly outline: readonly Vec2[];
  readonly holes: readonly (readonly Vec2[])[];
}

/** Obrys z vazby, nebo null, když ho nejde spočítat (neuzavřená místnost, chybná smyčka stěn). */
export function linkedShape(model: Model, link: SlabLink): SlabShape | null {
  try {
    if (link.kind === 'room') {
      const room = model.rooms[link.roomId];
      const g = room ? roomGeometry(model, room) : undefined;
      if (!room || !g || g.state !== 'ok' || !g.outline.length) return null;
      // Podlaha vede i pod otvory dveří (proužky v otvorech, room/floor.ts).
      const f = roomFloorShape(model, room, g);
      const outline = normalizeOutline(f.outline);
      return outlineError(outline) ? null : { outline, holes: f.holes };
    }
    const outline = normalizeOutline(outlineFromWalls(model, link.wallIds, link.boundary));
    return outlineError(outline) ? null : { outline, holes: [] };
  } catch {
    return null;
  }
}

/** Vazba bez smazaných prvků (smazaná místnost / méně než 2 stěny = vazba zanikne, deska zůstane). */
function liveLink(model: Model, link: SlabLink): SlabLink | undefined {
  if (link.kind === 'room') return model.rooms[link.roomId] ? link : undefined;
  const wallIds = link.wallIds.filter((id) => findWall(model, id));
  if (wallIds.length === link.wallIds.length) return link;
  return wallIds.length >= 2 ? { ...link, wallIds } : undefined;
}

const sameLoop = (a: readonly Vec2[], b: readonly Vec2[]) =>
  a.length === b.length && a.every((p, i) => dist(p, b[i] as Vec2) < 0.01);

const sameShape = (s: Slab, sh: SlabShape) =>
  sameLoop(s.outline, sh.outline) &&
  (s.holes ?? []).length === sh.holes.length &&
  sh.holes.every((h, i) => sameLoop(h, (s.holes ?? [])[i] as Vec2[]));

/** Deska s vazbou podle nového modelu (beze změny = stejný objekt). */
function follow(model: Model, s: Slab, prev: Slab | undefined): Slab {
  const link = s.link as SlabLink;
  // Příkaz změnil obrys a vazbu nechal = ruční úprava → zámek (základ 16).
  if (!link.locked && prev && prev.link === link && prev.outline !== s.outline)
    return { ...s, link: { ...link, locked: true } };
  const live = liveLink(model, link);
  if (!live) {
    const { link: _gone, ...rest } = s;
    return rest;
  }
  if (live.locked) return live === link ? s : { ...s, link: live };
  const shape = linkedShape(model, live);
  if (!shape || sameShape(s, shape)) return live === link ? s : { ...s, link: live };
  const { holes: _old, ...rest } = s;
  return { ...rest, link: live, outline: shape.outline, ...(shape.holes.length && { holes: shape.holes }) };
}

/** Přepočítá obrysy vázaných desek po příkazu (jako otvor jde se stěnou, `followOpenings`). */
export function followSlabs(before: Model, after: Model): Model {
  const keys = ['elements', 'rooms', 'openings', 'wallTypes', 'compositions', 'storeys'] as const;
  if (keys.every((k) => before[k] === after[k])) return after;
  const changed = allSlabs(after)
    .filter((s) => s.link)
    .map((s) => [s, follow(after, s, before.elements[s.id] as Slab | undefined)] as const)
    .filter(([a, b]) => a !== b)
    .map(([, b]) => b);
  if (!changed.length) return after;
  // Jiný počet bodů = hrany se přečíslují: kóty k té desce by ukazovaly jinam, proto zaniknou.
  const countOf = (id: string) => (after.elements[id] as Slab).outline.length;
  const renum = new Set(changed.filter((s) => s.outline.length !== countOf(s.id)).map((s) => s.id));
  const m = pruneOutlineDimensions(putElements(after, changed));
  const lost = Object.values(m.dimensions).filter((d) => dimensionOutlineIds(d).some((id) => renum.has(id)));
  return lost.length
    ? removeDimensions(
        m,
        lost.map((d) => d.id),
      )
    : m;
}
