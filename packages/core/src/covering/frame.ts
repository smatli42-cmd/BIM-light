// Transformace plochy povrchu z roviny (u, v) do 3D (mm, z nad ±0,000). Rovinná plocha: počátek a osy u,
// v; normála = u × v míří do místnosti. Válcová plocha (líc obloukové stěny, základ 23): u je délka po líci,
// v výška; rozvinutí zachová plochu. Plochu tak jde nakreslit ve 3D i v rozvinutém pohledu.
import type { Vec2 } from '../geometry/index.ts';

export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface PlaneFrame {
  readonly kind: 'plane';
  /** Bod (u, v) = (0, 0). */
  readonly origin: Vec3;
  /** Jednotkové osy u a v; normála = u × v (do místnosti). */
  readonly u: Vec3;
  readonly v: Vec3;
  readonly normal: Vec3;
}

export interface CylinderFrame {
  readonly kind: 'cylinder';
  /** Střed oblouku (z = úroveň v = 0). */
  readonly center: Vec3;
  readonly radius: number;
  /** Úhel bodu u = 0 (rad). */
  readonly angle0: number;
  /** Směr růstu u: +1 proti směru hodin, −1 po směru. */
  readonly dir: 1 | -1;
  /** Normála do místnosti míří od středu (outward), nebo ke středu (inward). */
  readonly facing: 'outward' | 'inward';
}

export type SurfaceFrame = PlaneFrame | CylinderFrame;

export const v3 = (x: number, y: number, z: number): Vec3 => ({ x, y, z });

/** Bod plochy (u, v) ve 3D. */
export function surfacePoint(f: SurfaceFrame, p: Vec2): Vec3 {
  if (f.kind === 'plane') {
    return v3(
      f.origin.x + f.u.x * p.x + f.v.x * p.y,
      f.origin.y + f.u.y * p.x + f.v.y * p.y,
      f.origin.z + f.u.z * p.x + f.v.z * p.y,
    );
  }
  const a = f.angle0 + (f.dir * p.x) / f.radius;
  return v3(f.center.x + f.radius * Math.cos(a), f.center.y + f.radius * Math.sin(a), f.center.z + p.y);
}

/** Normála plochy (do místnosti) v bodě (u, v). */
export function surfaceNormal(f: SurfaceFrame, p: Vec2): Vec3 {
  if (f.kind === 'plane') return f.normal;
  const a = f.angle0 + (f.dir * p.x) / f.radius;
  const k = f.facing === 'outward' ? 1 : -1;
  return v3(k * Math.cos(a), k * Math.sin(a), 0);
}

/** Svislá rovinná plocha: počátek v půdorysu, vodorovná osa u, v = nahoru; normála = u × v (vpravo od u). */
export function verticalPlane(origin: Vec2, uDir: Vec2, z: number): PlaneFrame {
  return {
    kind: 'plane',
    origin: v3(origin.x, origin.y, z),
    u: v3(uDir.x, uDir.y, 0),
    v: v3(0, 0, 1),
    normal: v3(uDir.y, -uDir.x, 0),
  };
}

/** Vodorovná plocha ve výšce z: podlaha (normála nahoru, u = x, v = y), strop (dolů, v = −y). */
export function horizontalPlane(z: number, up: boolean): PlaneFrame {
  return {
    kind: 'plane',
    origin: v3(0, 0, z),
    u: v3(1, 0, 0),
    v: v3(0, up ? 1 : -1, 0),
    normal: v3(0, 0, up ? 1 : -1),
  };
}

/** Rámec posunutý svisle tak, aby v = 0 leželo ve výšce z (čistá podlaha místnosti). */
export function withFloor(f: SurfaceFrame, z: number): SurfaceFrame {
  return f.kind === 'plane'
    ? { ...f, origin: v3(f.origin.x, f.origin.y, f.origin.z + z) }
    : { ...f, center: v3(f.center.x, f.center.y, f.center.z + z) };
}
