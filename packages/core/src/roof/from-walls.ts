// Střecha podle obrysu budovy (S2): referenční čára = vnější líc nosné vrstvy (jádra) obvodových stěn –
// tam leží pozednice; zateplení a omítky jsou vně a střecha je přesahem překryje (jako Archicad, kdy se
// obrys střechy vezme kouzelnou hůlkou z jádra stěn). Obrys = vnější smyčka sjednocení jader stěn podlaží
// (vnitřní příčky a místnosti jsou uvnitř a obrys nemění). Výška ref. čáry = vršek obvodových stěn.
import { union } from '../covering/polygon.ts';
import { dist, nearestOnPath, type Vec2 } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import type { Model } from '../model/types.ts';
import { pointInPolygon } from '../selection/pick.ts';
import { signedArea } from '../slab/geometry.ts';
import { wallGeometry } from '../wall/geometry.ts';
import { allWalls } from '../wall/queries.ts';
import type { Wall } from '../wall/types.ts';
import { wallHeight } from '../wall-height/resolve.ts';

export interface BuildingOutline {
  /** Vnější líc jader obvodových stěn proti směru hodin, bez bodů v řadě. */
  readonly outline: Vec2[];
  /** Nejvyšší vršek obvodových stěn (absolutně, mm). */
  readonly top: number;
  /** Stěny, jejichž jádro tvoří obrys. */
  readonly wallIds: Id[];
}

/** Půdorys nosného jádra stěny (bez jádra celá stěna). */
function corePolygons(model: Model, w: Wall): (readonly Vec2[])[] {
  const g = wallGeometry(model, w);
  const core = g.layers.filter((l) => l.span.layer.function === 'core').flatMap((l) => l.polygons);
  return (core.length ? core : g.outlines).map((p) => [...p]);
}

/** Vypustí body, které leží v přímce se sousedy (sjednocení je přidá v místech styku stěn). */
function dropCollinear(pts: readonly Vec2[]): Vec2[] {
  let out = [...pts];
  for (let changed = true; changed && out.length > 3;) {
    changed = false;
    for (let k = 0; k < out.length; k++) {
      const a = out[(k + out.length - 1) % out.length] as Vec2;
      const p = out[k] as Vec2;
      const b = out[(k + 1) % out.length] as Vec2;
      if (nearestOnPath({ kind: 'line', start: a, end: b }, p).distance < 0.5 || dist(a, p) < 0.5) {
        out = out.filter((_, x) => x !== k);
        changed = true;
        break;
      }
    }
  }
  return signedArea(out) < 0 ? out.reverse() : out;
}

/**
 * Obrys budovy v podlaží: stěny `wallIds` (výběr), jinak všechny stěny podlaží (hlavní model, ne bourané).
 * `point` = bod uvnitř budovy (klik); bez něj největší budova. null = stěny netvoří uzavřený obrys.
 */
export function buildingOutline(
  model: Model,
  storeyId: Id,
  o: { point?: Vec2; wallIds?: readonly Id[] } = {},
): BuildingOutline | null {
  const pick = new Set(o.wallIds ?? []);
  const walls = allWalls(model).filter((w) =>
    o.wallIds
      ? pick.has(w.id)
      : w.storeyId === storeyId && w.variant.kind === 'main' && w.status !== 'demolished',
  );
  const polys = walls.flatMap((w) => corePolygons(model, w).map((p) => ({ w, p })));
  const shapes = union(
    [],
    polys.map((x) => x.p),
  );
  // Budova = sjednocení s aspoň jednou dírou (uzavřená smyčka stěn); obrys je jeho vnější smyčka.
  const closed = shapes.filter((s) => s.holes.length > 0);
  const inside = o.point ? closed.find((s) => pointInPolygon(o.point as Vec2, s.outer)) : undefined;
  const chosen =
    inside ??
    (o.point ? undefined : [...closed].sort((a, b) => signedArea(b.outer) - signedArea(a.outer))[0]);
  if (!chosen) return null;
  const outline = dropCollinear(chosen.outer);
  const onOutline = (q: Vec2) =>
    outline.some((a, k) => {
      const b = outline[(k + 1) % outline.length] as Vec2;
      return nearestOnPath({ kind: 'line', start: a, end: b }, q).distance < 1;
    });
  const used = [...new Set(polys.filter((x) => x.p.some(onOutline)).map((x) => x.w))];
  if (!used.length) return null;
  return {
    outline,
    top: Math.max(...used.map((w) => wallHeight(model, w).top)),
    wallIds: used.map((w) => w.id),
  };
}
