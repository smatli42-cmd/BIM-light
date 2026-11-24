// Skutečná hodnota kóty spočítaná z modelu (základ 4): mm, u úhlové kóty stupně.
import {
  carrierOf,
  distanceToCarrier,
  dot,
  intersectNearest,
  mid,
  norm,
  pathLength,
  pointAt,
  sub,
  type Vec2,
} from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import type { Model } from '../model/types.ts';
import { edgePath } from '../wall/edges.ts';
import { wallGeometry } from '../wall/geometry.ts';
import { getWall } from '../wall/queries.ts';
import type { AngularDimension, Dimension, FaceRef } from './types.ts';

export function facePath(model: Model, ref: FaceRef) {
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
  if (d.kind === 'linear') return faceDistance(model, d.refs[0], d.refs[1]);
  if (d.kind === 'length') return pathLength(facePath(model, d.ref));
  return angularValue(model, d);
}

/** Stěny, na které kóta odkazuje. */
export function dimensionWallIds(d: Dimension): Id[] {
  if (d.kind === 'linear') return [d.refs[0].wallId, d.refs[1].wallId];
  if (d.kind === 'length') return [d.ref.wallId];
  return [...d.wallIds];
}
