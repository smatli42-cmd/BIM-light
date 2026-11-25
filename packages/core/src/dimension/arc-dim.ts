// Kóta po oblouku (plán stěn Z5): vzdálenost dvou hran přes obloukovou stěnu (čelo, hrana otvoru, líc
// napojené stěny) měřená délkou oblouku na zvoleném líci. Kótovací čára je soustředný oblouk.
import {
  add,
  angleOf,
  arcData,
  carrierOf,
  intersectNearest,
  mul,
  norm,
  offsetPath,
  pathLength,
  pointAt,
  sub,
  tessellate,
  type Path,
  type Vec2,
} from '../geometry/index.ts';
import type { Model } from '../model/types.ts';
import { wallSection } from '../wall/queries.ts';
import { getWall } from '../wall/queries.ts';
import type { ArcMeasure, LinearDimension } from './types.ts';

type ArcPath = Extract<Path, { kind: 'arc' }>;

/** Celá křivka měřeného líce (neoříznutá), nebo null u přímé stěny. */
export function measuredFace(model: Model, a: ArcMeasure): ArcPath | null {
  const w = getWall(model, a.wallId);
  if (w.path.kind !== 'arc' || Math.abs(w.path.bulge) < 1e-9) return null;
  return offsetPath(w.path, wallSection(model, w).faces[a.face]) as ArcPath;
}

/** Body, kde hrany `edges` protínají kružnici líce, a jejich parametry po líci. */
export function arcStations(face: ArcPath, edges: readonly Path[]): { p: Vec2; s: number }[] | null {
  const circle = carrierOf(face);
  const len = pathLength(face);
  const out: { p: Vec2; s: number }[] = [];
  for (const e of edges) {
    const p = intersectNearest(carrierOf(e), circle, pointAt(e, 0.5));
    if (!p) return null;
    const a = arcData(face);
    let t = (angleOf(sub(p, a.center)) - angleOf(sub(face.start, a.center))) / a.sweep;
    const full = (2 * Math.PI) / Math.abs(a.sweep);
    while (t < -0.5) t += full;
    while (t > full - 0.5) t -= full;
    out.push({ p, s: t * len });
  }
  return out;
}

/** Délka oblouku mezi hranami (NaN, když se nedá změřit). */
export function arcDistance(face: ArcPath | null, edges: readonly [Path, Path]): number {
  const st = face && arcStations(face, edges);
  return st ? Math.abs((st[1]?.s ?? 0) - (st[0]?.s ?? 0)) : Number.NaN;
}

/** Poměr poloměru referenční čáry k poloměru měřeného líce (převod délky po líci na posun po stěně). */
export function arcScale(model: Model, d: LinearDimension): number {
  const face = d.arc && measuredFace(model, d.arc);
  if (!face || !d.arc) return 1;
  return arcData(getWall(model, d.arc.wallId).path as ArcPath).radius / arcData(face).radius;
}

/** Kótovací oblouk a odkazové čáry (body na líci → body na kótovací čáře). */
export function arcLine(face: ArcPath, edges: readonly [Path, Path], offset: number) {
  const st = arcStations(face, edges);
  const a = arcData(face);
  if (!st) return null;
  const r = a.radius + offset;
  const at = (p: Vec2) => add(a.center, mul(norm(sub(p, a.center)), r));
  const [p0, p1] = [st[0]?.p as Vec2, st[1]?.p as Vec2];
  const sweep = (((st[1]?.s ?? 0) - (st[0]?.s ?? 0)) / pathLength(face)) * a.sweep;
  const q0 = at(p0);
  const q1 = at(p1);
  const line = tessellate({ kind: 'arc', start: q0, end: q1, bulge: Math.tan(sweep / 4) });
  return { line, from: [p0, p1] as const, to: [q0, q1] as const, center: a.center, radius: r };
}
