// Místní rám stěny v uzlu: bod na referenční čáře, směr kreslení, levá normála a vrstvy jako pásy
// offsetů. Hranice vrstvy = přímka bod + normála × offset ve směru tečny; u obloukové stěny (Z5)
// soustředná kružnice o poloměru R − s·offset (s = +1 proti směru hodin, normála míří ke středu).
import {
  add,
  arcData,
  dist,
  dot,
  endPoint,
  leftNormal,
  mul,
  nearestOnPath,
  norm,
  sub,
  tangentAt,
  type Path,
  type PathEnd,
  type Vec2,
} from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import { joinRank } from '../join-priority/rank.ts';
import type { Model } from '../model/types.ts';
import { wallSection } from '../wall/queries.ts';
import type { Wall } from '../wall/types.ts';
import { halfPlane, type Cut } from './half-plane.ts';

export interface FrameLayer {
  readonly index: number;
  /** Offsety hranic (lo < hi), doleva od směru kreslení. */
  readonly lo: number;
  readonly hi: number;
  readonly prio: number;
  readonly core: boolean;
  readonly finish: boolean;
  readonly materialId: Id;
}

/** Kružnice obloukové stěny: poloměr v offsetu o = R − s·o. */
export interface FrameArc {
  readonly c: Vec2;
  readonly R: number;
  readonly s: 1 | -1;
}

export const radiusAt = (a: FrameArc, o: number): number => a.R - a.s * o;

export interface Frame {
  readonly wall: Wall;
  /** Jen u obloukové stěny. */
  readonly arc?: FrameArc;
  readonly origin: Vec2;
  readonly tangent: Vec2;
  readonly normal: Vec2;
  readonly layers: readonly FrameLayer[];
  /** Offsety líců celé stěny (lo < hi). */
  readonly lo: number;
  readonly hi: number;
}

/** Konec stěny v uzlu: rám + směr z uzlu do těla stěny. */
export interface Arm extends Frame {
  readonly end: PathEnd;
  readonly out: Vec2;
}

export function frameLayers(model: Model, wall: Wall): FrameLayer[] {
  return wallSection(model, wall).layers.map((s, index) => ({
    index,
    lo: Math.min(s.from, s.to),
    hi: Math.max(s.from, s.to),
    prio: joinRank(model, s.layer.materialId),
    core: s.layer.function === 'core',
    finish: s.layer.function === 'finish',
    materialId: s.layer.materialId,
  }));
}

const isArc = (p: Path): p is Extract<Path, { kind: 'arc' }> => p.kind === 'arc' && Math.abs(p.bulge) > 1e-9;

function arcOf(p: Path): FrameArc | undefined {
  if (!isArc(p)) return undefined;
  const a = arcData(p);
  return { c: a.center, R: a.radius, s: a.sweep > 0 ? 1 : -1 };
}

function frameOf(model: Model, wall: Wall, origin: Vec2, tangent: Vec2): Frame {
  const layers = frameLayers(model, wall);
  const lo = Math.min(...layers.map((l) => l.lo));
  const hi = Math.max(...layers.map((l) => l.hi));
  const arc = arcOf(wall.path);
  return { wall, origin, tangent, normal: leftNormal(tangent), layers, lo, hi, ...(arc ? { arc } : {}) };
}

/** Rám průběžné stěny (hostitel v T, kříž) poblíž bodu. */
export function frameNear(model: Model, wall: Wall, near: Vec2): Frame {
  const p = wall.path;
  if (!isArc(p)) return frameOf(model, wall, p.start, tangentAt(p, 'start'));
  const hit = nearestOnPath(p, near);
  const a = arcData(p);
  const r = norm(sub(hit.point, a.center));
  const t = a.sweep > 0 ? leftNormal(r) : mul(leftNormal(r), -1);
  return frameOf(model, wall, hit.point, t);
}

export function armOf(model: Model, wall: Wall, end: PathEnd): Arm {
  const t = tangentAt(wall.path, end);
  const f = frameOf(model, wall, endPoint(wall.path, end), t);
  return { ...f, end, out: end === 'start' ? t : mul(t, -1) };
}

/** Hranice vrstvy jako křivka: přímka (bod + směr), nebo kružnice. */
export type Curve =
  | { readonly kind: 'line'; readonly p: Vec2; readonly d: Vec2 }
  | { readonly kind: 'circle'; readonly c: Vec2; readonly r: number };

/** Hranice v offsetu `o` rámu. */
export function curveAt(f: Frame, o: number): Curve {
  const p = add(f.origin, mul(f.normal, o));
  return f.arc ? { kind: 'circle', c: f.arc.c, r: radiusAt(f.arc, o) } : { kind: 'line', p, d: f.tangent };
}

/** Řez hranicí v offsetu `o`, který drží stranu ve směru `toward` (měřeno v uzlu). */
export function boundary(f: Frame, o: number, toward: Vec2): Cut {
  const p = add(f.origin, mul(f.normal, o));
  if (!f.arc) return halfPlane(p, f.tangent, toward);
  return { c: f.arc.c, r: radiusAt(f.arc, o), inside: dot(sub(p, f.arc.c), toward) < 0 };
}

/** Offset „vlevo“ a „vpravo“ vrstvy vůči směru z uzlu do stěny. */
export const outSides = (a: Arm, l: { lo: number; hi: number }) =>
  a.end === 'start' ? { left: l.hi, right: l.lo } : { left: l.lo, right: l.hi };

/** Velikost uzlu: jak daleko za uzel smí vrstvy dojet (pokos ostrého úhlu až ~2°). */
export const reachOf = (frames: readonly Frame[]): number =>
  60 * Math.max(...frames.map((f) => f.hi - f.lo), 1) + 1000;

export const armKey = (wallId: Id, end: PathEnd): string => `${wallId}:${end}`;

export const sameNode = (a: Vec2, b: Vec2): boolean => dist(a, b) < 1;
