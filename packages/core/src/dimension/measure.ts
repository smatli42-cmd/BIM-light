// Skutečná hodnota kóty spočítaná z modelu (základ 4): mm, u úhlové kóty stupně.
import {
  arcData,
  carrierOf,
  dist,
  distanceToCarrier,
  dot,
  intersectNearest,
  mid,
  norm,
  pathLength,
  pointAt,
  sub,
  type Path,
  type Vec2,
} from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import type { Model } from '../model/types.ts';
import { openingEdgePath } from '../opening/edges.ts';
import { arcDistance, measuredFace } from './arc-dim.ts';
import { edgePath } from '../wall/edges.ts';
import { wallGeometry } from '../wall/geometry.ts';
import { getWall } from '../wall/queries.ts';
import type { AngularDimension, Dimension, FaceRef, LengthMeasure } from './types.ts';

export function facePath(model: Model, ref: FaceRef) {
  if (ref.openingId) {
    const o = model.openings[ref.openingId];
    if (!o) throw new Error(`Otvor ${ref.openingId} neexistuje`);
    return openingEdgePath(model, o, ref.face === 'end' ? 'end' : 'start');
  }
  return edgePath(wallGeometry(model, getWall(model, ref.wallId)), ref.face);
}

/** Vzdálenost mezi dvěma líci: od středu prvního líce kolmo k nosné čáře druhého. */
export function faceDistance(model: Model, a: FaceRef, b: FaceRef): number {
  return distanceToCarrier(pointAt(facePath(model, a), 0.5), carrierOf(facePath(model, b)));
}

export interface AngleGeometry {
  readonly vertex: Vec2;
  readonly dirs: readonly [Vec2, Vec2];
  readonly degrees: number;
}

/** Vrchol a ramena úhlové kóty: průsečík os stěn a směry k jejich středům. */
export function angleGeometry(model: Model, wallIds: readonly [Id, Id]): AngleGeometry | null {
  const a = getWall(model, wallIds[0]).path;
  const b = getWall(model, wallIds[1]).path;
  const ma = pointAt(a, 0.5);
  const vertex = intersectNearest(carrierOf(a), carrierOf(b), mid(ma, pointAt(b, 0.5)));
  if (!vertex) return null;
  const da = norm(sub(ma, vertex));
  const db = norm(sub(pointAt(b, 0.5), vertex));
  const cos = Math.max(-1, Math.min(1, dot(da, db)));
  return { vertex, dirs: [da, db], degrees: (Math.acos(cos) * 180) / Math.PI };
}

function angularValue(model: Model, d: AngularDimension): number {
  return angleGeometry(model, d.wallIds)?.degrees ?? Number.NaN;
}

/** Aktuální hodnota kóty. */
export function measureDimension(model: Model, d: Dimension): number {
  if (d.kind === 'linear')
    return d.arc
      ? arcDistance(measuredFace(model, d.arc), [facePath(model, d.refs[0]), facePath(model, d.refs[1])])
      : faceDistance(model, d.refs[0], d.refs[1]);
  if (d.kind === 'length') return lengthValue(facePath(model, d.ref), d.measure ?? 'arc');
  return angularValue(model, d);
}

/** Délka líce, tětiva, nebo poloměr (přímý líc nemá poloměr → NaN). */
export function lengthValue(face: Path, measure: LengthMeasure): number {
  if (measure === 'chord') return dist(face.start, face.end);
  if (measure === 'radius') return isArcPath(face) ? arcData(face).radius : Number.NaN;
  return pathLength(face);
}

export const isArcPath = (p: Path): p is Extract<Path, { kind: 'arc' }> =>
  p.kind === 'arc' && Math.abs(p.bulge) > 1e-9;

/** Otvory, na které kóta odkazuje (hrany otvoru). */
export function dimensionOpeningIds(d: Dimension): Id[] {
  if (d.kind === 'linear') return d.refs.flatMap((r) => (r.openingId ? [r.openingId] : []));
  if (d.kind === 'length') return d.ref.openingId ? [d.ref.openingId] : [];
  return [];
}

/** Stěny, na které kóta odkazuje. */
export function dimensionWallIds(d: Dimension): Id[] {
  if (d.kind === 'linear') return [d.refs[0].wallId, d.refs[1].wallId];
  if (d.kind === 'length') return [d.ref.wallId];
  return [...d.wallIds];
}
