// Stěna stojí na nosné desce (hlášení uživatele 2026-11-27; česká praxe, Revit „Připojit spodek“ k desce,
// Archicad spodek stěny k desce). Spodek stěny vázaný na podlaží leží na čisté podlaze (±0); když je pod ním
// jen skladba podlahy (do MAX_BUILDUP), stěna sahá dolů k hornímu líci nosné desky pod sebou a podlaha se
// k ní přisazuje z obou stran (stěna ji ořízne, junction/slab-wall.ts). Stěna, pod kterou v té výšce už stojí
// jiná stěna (obvodová stěna 1.NP přes čelo stropu), sjede jen k jejímu vršku. Počítá se, neukládá (základ 4);
// platí stejně pro řez, 3D i výkazy (všechny berou wallHeight).
import { offsetPath, pointAt } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import { resolveHeight } from '../model/height.ts';
import type { Model } from '../model/types.ts';
import { pointInPolygon } from '../selection/pick.ts';
import { slabLevels } from '../slab/geometry.ts';
import { allSlabs } from '../slab/queries.ts';
import { wallGeometry } from '../wall/geometry.ts';
import { allWalls, wallSection } from '../wall/queries.ts';
import type { Wall } from '../wall/types.ts';

/** Nejvyšší skladba podlahy, přes kterou stěna sjede k nosné desce (mm). */
export const MAX_BUILDUP = 300;
const SAMPLES = [0.5, 0.25, 0.75, 0.05, 0.95];

const buildingOf = (m: Model, storeyId: Id) => m.storeys[storeyId]?.buildingId;

/** Horní líc nosné desky pod stěnou ve skladbě podlahy (nejvyšší), nebo null. */
function structureTop(m: Model, w: Wall, bottom: number, pts: readonly { x: number; y: number }[]) {
  let best: number | null = null;
  for (const s of allSlabs(m)) {
    if (s.slabFunction !== 'structure' || s.variant.kind !== w.variant.kind) continue;
    if (buildingOf(m, s.storeyId) !== buildingOf(m, w.storeyId)) continue;
    const top = slabLevels(m, s).top;
    if (!(top < bottom - 1e-6 && top >= bottom - MAX_BUILDUP)) continue;
    if (!pts.some((p) => pointInPolygon(p, s.outline))) continue;
    if (best === null || top > best) best = top;
  }
  return best;
}

/** Vršek stěn pod stěnou, které zasahují do výšky (target, bottom) – nesmí se překrýt. */
function lowerWallsTop(
  m: Model,
  w: Wall,
  target: number,
  bottom: number,
  pts: readonly { x: number; y: number }[],
) {
  let top = target;
  for (const o of allWalls(m)) {
    if (o.id === w.id || o.variant.kind !== w.variant.kind) continue;
    const h = resolveHeight(m, o.height);
    if (!(h.top > top + 1e-6 && h.bottom < bottom - 1e-6)) continue;
    const outlines = wallGeometry(m, o).outlines;
    if (pts.some((p) => outlines.some((ol) => ol.length >= 3 && pointInPolygon(p, ol))))
      top = Math.min(bottom, h.top);
  }
  return top;
}

const cache = new WeakMap<Model, Map<Id, number>>();

/** Skutečný spodek stěny (mm nad ±0,000): vázaný spodek, nebo horní líc nosné desky pod skladbou podlahy. */
export function wallBase(m: Model, w: Wall): number {
  const byId = cache.get(m) ?? new Map<Id, number>();
  cache.set(m, byId);
  const hit = byId.get(w.id);
  if (hit !== undefined) return hit;
  const bottom = resolveHeight(m, w.height).bottom;
  // Body na ose stěny (referenční čára může ležet na líci = na hraně obrysu stěny pod ní).
  const axis = offsetPath(w.path, wallSection(m, w).faces.axis);
  const pts = SAMPLES.map((t) => pointAt(axis, t));
  const target = structureTop(m, w, bottom, pts);
  const res = target === null ? bottom : lowerWallsTop(m, w, target, bottom, pts);
  byId.set(w.id, res);
  return res;
}
