// Zakončení konce stěny podle uloženého napojení (základ 24), ne podle shody souřadnic.
// Roh: líce se protnou (pokos). T napojení: konec se utne na bližším líci hostitele.
// Bez napojení: kolmé ukončení. Počítá s úsečkou i obloukem (základ 23).
import {
  carrierOf,
  dist,
  endPoint,
  intersectNearest,
  leftNormal,
  norm,
  offsetPath,
  sub,
  tangentAt,
  type Carrier,
  type Path,
  type PathEnd,
  type Vec2,
} from '../geometry/index.ts';
import type { Model } from '../model/types.ts';
import { connectionsOf, endToType, getWall, sidesFor, typeToEnd, wallSection } from './queries.ts';
import type { Wall } from './types.ts';
import { leftOffsetOf } from './offset.ts';

export type EndJoin = 'free' | 'corner' | 'tee' | 'multiple';

export interface EndCut {
  readonly join: EndJoin;
  /** Přímka, na které končí všechny líce a hranice vrstev. */
  readonly cut: Carrier;
}

/** Offsety líců stěny „vlevo“ a „vpravo“ od směru ven z uzlu. */
function outFaces(model: Model, wall: Wall, end: PathEnd): { left: number; right: number; t: number } {
  const s = wallSection(model, wall);
  const hi = Math.max(s.faces.ref, s.faces.opp);
  const lo = Math.min(s.faces.ref, s.faces.opp);
  return end === 'start' ? { left: hi, right: lo, t: s.thickness } : { left: lo, right: hi, t: s.thickness };
}

function squareCut(path: Path, end: PathEnd): Carrier {
  return { kind: 'line', p: endPoint(path, end), d: leftNormal(tangentAt(path, end)) };
}

function cornerCut(model: Model, w: Wall, end: PathEnd, x: Wall, xEnd: PathEnd): Carrier | null {
  const a = outFaces(model, w, end);
  const b = outFaces(model, x, xEnd);
  const node = endPoint(w.path, end);
  const lim = 6 * Math.max(a.t, b.t) + 1;
  const c = (wall: Wall, o: number) => carrierOf(offsetPath(wall.path, o));
  const pl = intersectNearest(c(w, a.left), c(x, b.right), node, lim);
  const pr = intersectNearest(c(w, a.right), c(x, b.left), node, lim);
  if (!pl || !pr || dist(pl, pr) < 1e-6) return null;
  return { kind: 'line', p: pl, d: norm(sub(pr, pl)) };
}

/** Nejvyšší priorita napojování materiálů stěny (obvykle jádro). */
function wallPriority(model: Model, w: Wall): number {
  const prio = wallSection(model, w).layers.map(
    (l) => model.materials[l.layer.materialId]?.joinPriority ?? 0,
  );
  return Math.max(0, ...prio);
}

/**
 * Offset čáry na hostiteli, kde končí stěna napojená v T (priorita materiálů, rozhodnutí 5):
 * od přivráceného líce projde povrchovými vrstvami a izolací hostitele s nižší prioritou, jádro nikdy.
 */
export function teeCutOffset(model: Model, w: Wall, end: PathEnd, host: Wall): number {
  const far: Vec2 = endPoint(w.path, end === 'start' ? 'end' : 'start');
  const side = Math.sign(leftOffsetOf(host.path, far)) || 1;
  const s = wallSection(model, host);
  const p = wallPriority(model, w);
  const nearness = (l: (typeof s.layers)[number]) => Math.max(side * l.from, side * l.to);
  const layers = [...s.layers].sort((a, b) => nearness(b) - nearness(a));
  let cut = side * s.faces.ref > side * s.faces.opp ? s.faces.ref : s.faces.opp;
  for (const l of layers) {
    const prio = model.materials[l.layer.materialId]?.joinPriority ?? 0;
    if (l.layer.function === 'core' || prio >= p) break;
    cut = side * l.from < side * l.to ? l.from : l.to;
  }
  return cut;
}

function teeCut(model: Model, w: Wall, end: PathEnd, host: Wall): Carrier {
  return carrierOf(offsetPath(host.path, teeCutOffset(model, w, end, host)));
}

/** Zakončení jednoho konce stěny. */
export function endCut(model: Model, wall: Wall, end: PathEnd): EndCut {
  const here = connectionsOf(model, wall.id).filter((c) => sidesFor(c, wall.id).own.at === endToType(end));
  const square = { join: 'free' as const, cut: squareCut(wall.path, end) };
  if (here.length === 0) return square;
  if (here.length > 1) return { join: 'multiple', cut: square.cut };
  const conn = here[0];
  if (!conn) return square;
  const other = sidesFor(conn, wall.id).other;
  const otherWall = getWall(model, other.wallId);
  const otherEnd = typeToEnd(other.at);
  if (otherEnd === null) return { join: 'tee', cut: teeCut(model, wall, end, otherWall) };
  const cut = cornerCut(model, wall, end, otherWall, otherEnd);
  return cut ? { join: 'corner', cut } : square;
}
