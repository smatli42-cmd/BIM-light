// Stěna stojí na nosné desce (hlášení uživatele 2026-11-27; česká praxe, Revit „Připojit spodek / vršek“
// k desce, Archicad spodek a vršek stěny k desce). Počítá se, neukládá (základ 4); platí stejně pro řez,
// 3D i výkazy (všechny berou wallHeight):
// - Spodek: když je pod vázaným spodkem (čistá podlaha) jen skladba podlahy (do MAX_BUILDUP), stěna sahá
//   k hornímu líci nosné desky pod sebou; podlaha se k ní přisadí z obou stran (junction/slab-wall.ts).
//   Stěna, pod kterou v té výšce stojí jiná stěna (obvodová 1.NP přes čelo stropu), sjede jen k jejímu vršku.
// - Vršek: stěna „do podlaží + 1“, jejíž vršek leží ve skladbě podlahy nad nosnou deskou, končí na horním
//   líci desky (deska ji ve své výšce prořízne) – kromě míst, kde na ní stojí stěna z patra.
// - Jen prvky, které spolu stojí (fáze): zbouraný a nový prvek se neovlivňují.
import { offsetPath, pointAt, type Vec2 } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import { resolveHeight, type ResolvedHeight } from '../model/height.ts';
import type { Model } from '../model/types.ts';
import { pointInPolygon } from '../selection/pick.ts';
import { slabLevels } from '../slab/geometry.ts';
import { allSlabs } from '../slab/queries.ts';
import type { Slab } from '../slab/types.ts';
import { wallGeometry } from '../wall/geometry.ts';
import { canJoinStatus } from '../wall/auto-connect.ts';
import { allWalls, wallSection } from '../wall/queries.ts';
import type { Wall } from '../wall/types.ts';

/** Nejvyšší skladba podlahy, přes kterou stěna sjede k nosné desce (mm). */
export const MAX_BUILDUP = 300;
const SAMPLES = [0.5, 0.25, 0.75, 0.05, 0.95];
const EPS = 1e-6;

interface Ctx {
  readonly m: Model;
  readonly slabs: readonly { slab: Slab; top: number; bottom: number }[];
  readonly walls: readonly Wall[];
  readonly h: Map<Id, ResolvedHeight>;
  readonly pts: Map<Id, Vec2[]>;
  readonly outlines: Map<Id, Vec2[][]>;
  readonly base: Map<Id, number>;
  readonly top: Map<Id, number>;
}

const ctxs = new WeakMap<Model, Ctx>();

function ctxOf(m: Model): Ctx {
  const hit = ctxs.get(m);
  if (hit) return hit;
  const slabs = allSlabs(m)
    .filter((s) => s.slabFunction === 'structure')
    .map((slab) => ({ slab, ...slabLevels(m, slab) }));
  const c: Ctx = {
    m,
    slabs,
    walls: allWalls(m),
    h: new Map(),
    pts: new Map(),
    outlines: new Map(),
    base: new Map(),
    top: new Map(),
  };
  ctxs.set(m, c);
  return c;
}

const memo = <T>(map: Map<Id, T>, id: Id, f: () => T): T => {
  const v = map.get(id);
  if (v !== undefined) return v;
  const r = f();
  map.set(id, r);
  return r;
};

const height = (c: Ctx, w: Wall) => memo(c.h, w.id, () => resolveHeight(c.m, w.height));

/** Body na ose stěny (referenční čára může ležet na líci = na hraně obrysu sousední stěny). */
const axisPoints = (c: Ctx, w: Wall) =>
  memo(c.pts, w.id, () => {
    const axis = offsetPath(w.path, wallSection(c.m, w).faces.axis);
    return SAMPLES.map((t) => pointAt(axis, t));
  });

/** Leží osa stěny `w` v půdorysu stěny `o`? */
const onWall = (c: Ctx, w: Wall, o: Wall) => {
  const outlines = memo(c.outlines, o.id, () => wallGeometry(c.m, o).outlines.filter((ol) => ol.length >= 3));
  return axisPoints(c, w).some((p) => outlines.some((ol) => pointInPolygon(p, ol)));
};

const building = (m: Model, storeyId: Id) => m.storeys[storeyId]?.buildingId;

/** Nosné desky pod osou stěny (stejná budova a varianta). */
const slabsUnder = (c: Ctx, w: Wall) =>
  c.slabs.filter(
    ({ slab }) =>
      slab.variant.kind === w.variant.kind &&
      canJoinStatus(slab.status, w.status) &&
      building(c.m, slab.storeyId) === building(c.m, w.storeyId) &&
      axisPoints(c, w).some((p) => pointInPolygon(p, slab.outline)),
  );

const others = (c: Ctx, w: Wall) =>
  c.walls.filter(
    (o) => o.id !== w.id && o.variant.kind === w.variant.kind && canJoinStatus(o.status, w.status),
  );

/** Skutečný vršek stěny (mm nad ±0,000). */
export function wallTop(m: Model, w: Wall): number {
  const c = ctxOf(m);
  return memo(c.top, w.id, () => {
    const h = height(c, w);
    const tops = slabsUnder(c, w)
      .filter((s) => s.top < h.top - EPS && s.top >= h.top - MAX_BUILDUP && s.bottom > h.bottom + EPS)
      .map((s) => s.top);
    if (!tops.length) return h.top;
    const slabTop = Math.max(...tops);
    const carried = others(c, w).some((o) => {
      const b = height(c, o).bottom;
      return b >= slabTop - EPS && b <= h.top + EPS && onWall(c, w, o);
    });
    return carried ? h.top : slabTop;
  });
}

/** Skutečný spodek stěny (mm nad ±0,000). */
export function wallBase(m: Model, w: Wall): number {
  const c = ctxOf(m);
  return memo(c.base, w.id, () => {
    const bottom = height(c, w).bottom;
    const tops = slabsUnder(c, w)
      .map((s) => s.top)
      .filter((top) => top < bottom - EPS && top >= bottom - MAX_BUILDUP);
    if (!tops.length) return bottom;
    let res = Math.max(...tops);
    for (const o of others(c, w)) {
      const oTop = wallTop(m, o);
      if (oTop > res + EPS && height(c, o).bottom < bottom - EPS && onWall(c, w, o))
        res = Math.min(bottom, oTop);
    }
    return res;
  });
}
