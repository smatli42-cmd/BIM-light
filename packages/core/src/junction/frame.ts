// Místní rám stěny v uzlu: bod na referenční čáře, směr kreslení, levá normála a vrstvy jako pásy
// offsetů. Přímka hranice vrstvy = bod + normála × offset, směr = tečna (u oblouku tečna v uzlu, Z5).
import {
  add,
  arcData,
  dist,
  endPoint,
  leftNormal,
  mul,
  nearestOnPath,
  norm,
  sub,
  tangentAt,
  type PathEnd,
  type Vec2,
} from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import type { Model } from '../model/types.ts';
import { wallSection } from '../wall/queries.ts';
import type { Wall } from '../wall/types.ts';
import { halfPlane, type HalfPlane } from './half-plane.ts';

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

export interface Frame {
  readonly wall: Wall;
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
    prio: model.materials[s.layer.materialId]?.joinPriority ?? 0,
    core: s.layer.function === 'core',
    finish: s.layer.function === 'finish',
    materialId: s.layer.materialId,
  }));
}

function frameOf(model: Model, wall: Wall, origin: Vec2, tangent: Vec2): Frame {
  const layers = frameLayers(model, wall);
  const lo = Math.min(...layers.map((l) => l.lo));
  const hi = Math.max(...layers.map((l) => l.hi));
  return { wall, origin, tangent, normal: leftNormal(tangent), layers, lo, hi };
}

/** Rám průběžné stěny (hostitel v T, kříž) poblíž bodu. */
export function frameNear(model: Model, wall: Wall, near: Vec2): Frame {
  const p = wall.path;
  if (p.kind === 'line' || Math.abs(p.bulge) < 1e-9)
    return frameOf(model, wall, p.start, tangentAt(p, 'start'));
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

/** Bod a směr přímky v offsetu `o` rámu. */
export const lineAt = (f: Frame, o: number): { p: Vec2; d: Vec2 } => ({
  p: add(f.origin, mul(f.normal, o)),
  d: f.tangent,
});

/** Polorovina hranice v offsetu `o`, která drží stranu ve směru `toward`. */
export function boundary(f: Frame, o: number, toward: Vec2): HalfPlane {
  const l = lineAt(f, o);
  return halfPlane(l.p, l.d, toward);
}

/** Offset „vlevo“ a „vpravo“ vrstvy vůči směru z uzlu do stěny. */
export const outSides = (a: Arm, l: { lo: number; hi: number }) =>
  a.end === 'start' ? { left: l.hi, right: l.lo } : { left: l.lo, right: l.hi };

/** Velikost uzlu: jak daleko za uzel smí vrstvy dojet (pokos ostrého úhlu až ~2°). */
export const reachOf = (frames: readonly Frame[]): number =>
  60 * Math.max(...frames.map((f) => f.hi - f.lo), 1) + 1000;

export const armKey = (wallId: Id, end: PathEnd): string => `${wallId}:${end}`;

export const sameNode = (a: Vec2, b: Vec2): boolean => dist(a, b) < 1;
