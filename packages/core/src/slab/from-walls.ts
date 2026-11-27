// Obrys desky ze stěn (D2; Revit „Vybrat stěny“, Archicad obrys podle stěn): stěny se seřadí do smyčky
// podle koncových bodů, každá dá čáru na vnitřní straně (líc, nebo líc nosného jádra) a sousední čáry
// se protnou. Oblouková stěna dá oblouk rozložený na body (základ 23).
import {
  carrierOf,
  dist,
  intersectNearest,
  offsetPath,
  reversePath,
  tessellate,
  withEnd,
  type Path,
  type Vec2,
} from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import type { Model } from '../model/types.ts';
import { wallGeometry } from '../wall/geometry.ts';
import { getWall } from '../wall/queries.ts';
import type { Wall } from '../wall/types.ts';
import { signedArea } from './geometry.ts';

/** Kudy vede obrys: vnitřní líc stěny, nebo vnitřní líc nosného jádra (Revit „k jádru“). */
export type WallBoundary = 'face' | 'core';
export const WALL_BOUNDARIES: readonly WallBoundary[] = ['face', 'core'];

interface Leg {
  readonly wall: Wall;
  /** Osa ve směru oběhu smyčky. */
  readonly path: Path;
  readonly reversed: boolean;
}

/** Seřadí stěny do smyčky: další je ta, jejíž konec je nejblíž volnému konci předchozí. */
function orderLoop(walls: readonly Wall[]): Leg[] {
  const rest = [...walls];
  const first = rest.shift() as Wall;
  const legs: Leg[] = [{ wall: first, path: first.path, reversed: false }];
  while (rest.length) {
    const at = (legs[legs.length - 1] as Leg).path.end;
    let best = 0;
    let bestD = Infinity;
    let rev = false;
    rest.forEach((w, i) => {
      const ds = dist(w.path.start, at);
      const de = dist(w.path.end, at);
      if (Math.min(ds, de) < bestD) [best, bestD, rev] = [i, Math.min(ds, de), de < ds];
    });
    const w = rest.splice(best, 1)[0] as Wall;
    legs.push({ wall: w, path: rev ? reversePath(w.path) : w.path, reversed: rev });
  }
  return legs;
}

/** Odsazení vnitřní hrany od osy stěny (kladně = doleva od směru stěny). */
function innerOffset(model: Model, w: Wall, sign: number, boundary: WallBoundary): number {
  const sec = wallGeometry(model, w).section;
  const core = sec.layers.filter((l) => l.layer.function === 'core').flatMap((l) => [l.from, l.to]);
  const cands = boundary === 'core' && core.length ? core : [sec.faces.ref, sec.faces.opp];
  return cands.reduce((a, b) => (sign * b > sign * a ? b : a));
}

/** Vnitřní čára každé stěny ve směru oběhu. */
function innerLines(model: Model, legs: readonly Leg[], boundary: WallBoundary): Path[] {
  // Smysl oběhu z celých os (u dvou stěn – úsečka a oblouk – nestačí koncové body).
  const ccw = signedArea(legs.flatMap((l) => tessellate(l.path).slice(0, -1))) > 0;
  return legs.map((l) => {
    // Uvnitř je vlevo od směru oběhu (proti směru hodin); u obrácené stěny je to její pravá strana.
    const sign = (ccw ? 1 : -1) * (l.reversed ? -1 : 1);
    const line = offsetPath(l.wall.path, innerOffset(model, l.wall, sign, boundary));
    return l.reversed ? reversePath(line) : line;
  });
}

/** Rohy smyčky: průsečík sousedních čar (rovnoběžné navazující čáry = společný konec). */
function corners(lines: readonly Path[]): Vec2[] {
  return lines.map((a, i) => {
    const b = lines[(i + 1) % lines.length] as Path;
    return intersectNearest(carrierOf(a), carrierOf(b), a.end) ?? a.end;
  });
}

/** Obrys desky ze stěn (body proti směru hodin nebo po směru; normalizuje příkaz). */
export function outlineFromWalls(model: Model, wallIds: readonly Id[], boundary: WallBoundary): Vec2[] {
  if (wallIds.length < 2) throw new Error('Obrys ze stěn potřebuje aspoň 2 stěny');
  const legs = orderLoop(wallIds.map((id) => getWall(model, id)));
  const lines = innerLines(model, legs, boundary);
  const cs = corners(lines);
  const out: Vec2[] = [];
  lines.forEach((line, i) => {
    const start = cs[(i - 1 + cs.length) % cs.length] as Vec2;
    const end = cs[i] as Vec2;
    if (line.kind === 'arc')
      out.push(...tessellate(withEnd(withEnd(line, 'start', start), 'end', end)).slice(0, -1));
    else out.push(start);
  });
  return out;
}
