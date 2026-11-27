// Vazba vršku stěny na desku (desky D4; Revit „Attach Top“, Archicad „spojit s deskou“). Vazba je druh
// vršku ve výšce stěny (`top.kind = 'slab'`), ne číslo – změna výšky nebo tloušťky desky stěnu přepočítá
// (základy 12, 24). Odpojení (i smazáním desky) zachová dosavadní vršek jako podlaží + 1 + odsazení.
import { pointAt } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import { resolveHeight, type HeightBinding, type HeightTop } from '../model/height.ts';
import { storeyLevel } from '../model/storeys.ts';
import type { Model } from '../model/types.ts';
import { putElements } from '../model/update.ts';
import { pointInPolygon } from '../selection/pick.ts';
import { slabLevels } from '../slab/geometry.ts';
import { allSlabs } from '../slab/queries.ts';
import type { Slab } from '../slab/types.ts';
import { allWalls } from '../wall/queries.ts';
import type { Wall } from '../wall/types.ts';

const SAMPLES = [0.5, 0.25, 0.75, 0.05, 0.95];

/** Budova podlaží (desky jiné budovy se nehledají). */
const buildingOf = (m: Model, storeyId: Id) => m.storeys[storeyId]?.buildingId;

/**
 * Deska nad stěnou: obrys obsahuje některý bod osy stěny, spodní líc je nad spodkem stěny; z nich ta
 * s nejnižším spodním lícem (nosný strop pod skladbou podlahy). Žádná → null.
 */
export function slabAboveWall(model: Model, wall: Wall): Slab | null {
  const bottom = resolveHeight(model, wall.height).bottom;
  const pts = SAMPLES.map((t) => pointAt(wall.path, t));
  const building = buildingOf(model, wall.storeyId);
  let best: { slab: Slab; level: number } | null = null;
  for (const slab of allSlabs(model)) {
    if (buildingOf(model, slab.storeyId) !== building) continue;
    if (!pts.some((p) => pointInPolygon(p, slab.outline))) continue;
    const level = slabLevels(model, slab).bottom;
    if (level > bottom + 1 && (!best || level < best.level)) best = { slab, level };
  }
  return best?.slab ?? null;
}

/** Vršek bez vazby na desku se stejnou výškou: podlaží + 1 + odsazení, nad budovou pevná výška. */
export function detachedTop(model: Model, h: HeightBinding): HeightTop {
  const r = resolveHeight(model, h);
  const level = storeyLevel(model, h.baseStoreyId, 1);
  if (level !== null && level > r.bottom) return { kind: 'storey', storeys: 1, offset: r.top - level };
  return { kind: 'height', value: r.top - r.bottom };
}

/** Stěny s vrškem na některé z desek. */
export const wallsAttachedTo = (model: Model, slabIds: ReadonlySet<Id>): Wall[] =>
  allWalls(model).filter((w) => w.height.top.kind === 'slab' && slabIds.has(w.height.top.slabId));

/** Odpojí stěny od desek (před smazáním desek); výška stěn zůstane. */
export function detachWallsFrom(model: Model, slabIds: ReadonlySet<Id>): Model {
  const walls = wallsAttachedTo(model, slabIds).map((w) => ({
    ...w,
    height: { ...w.height, top: detachedTop(model, w.height) },
  }));
  return walls.length ? putElements(model, walls) : model;
}
