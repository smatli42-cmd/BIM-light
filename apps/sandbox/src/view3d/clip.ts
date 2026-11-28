// Ořezový kvádr 3D okna (jako Section Box v Revitu): tělesa se oříznou přesně, ne jen v obraze – každý pás
// vrstvy je svislý hranol, takže stačí oříznout výšku (z) a půdorys obdélníkem (2D průnik, polygon-clipping).
// Výsledek jsou zase uzavřená tělesa: řez je plný a má barvu materiálu (jako řez v Archicadu), žádná dutá
// skořápka. Kvádr je v osách modelu (mm), zatím bez natočení.
import { boxPlanes, cutMeshSolid } from './clip-mesh.ts';
import polygonClipping, { type MultiPolygon } from 'polygon-clipping';
import type { Slab } from './slice.ts';
import type { Solid } from './solids.ts';

export interface Point3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** Kvádr v osách modelu (mm). */
export interface Box3D {
  readonly min: Point3;
  readonly max: Point3;
}

const EPS = 0.5;

function rectOf(b: Box3D): MultiPolygon {
  const { min, max } = b;
  return [
    [
      [
        [min.x, min.y],
        [max.x, min.y],
        [max.x, max.y],
        [min.x, max.y],
        [min.x, min.y],
      ],
    ],
  ];
}

function clipSlab(s: Slab, b: Box3D, rect: MultiPolygon): Slab | null {
  const z0 = Math.max(s.z0, b.min.z);
  const z1 = Math.min(s.z1, b.max.z);
  if (z1 - z0 < EPS) return null;
  let shape: MultiPolygon;
  try {
    shape = polygonClipping.intersection(s.shape, rect);
  } catch {
    return null;
  }
  return shape.length ? { z0, z1, shape } : null;
}

/** Tělesa oříznutá kvádrem; těleso celé mimo kvádr zmizí. */
export function clipSolids(solids: readonly Solid[], box: Box3D): Solid[] {
  const rect = rectOf(box);
  return solids.flatMap((s) => {
    if (s.mesh) {
      const cut = cutMeshSolid(s, boxPlanes(box));
      return cut ? [cut] : [];
    }
    const slabs = s.slabs.map((x) => clipSlab(x, box, rect)).filter((x): x is Slab => !!x);
    return slabs.length ? [{ ...s, slabs }] : [];
  });
}

/** Obalový kvádr těles (mm), nebo null, když nic není. */
export function solidsBounds(solids: readonly Solid[]): Box3D | null {
  let x0 = Infinity,
    y0 = Infinity,
    z0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity,
    z1 = -Infinity;
  for (const s of solids) {
    const m = s.mesh ?? [];
    for (let i = 0; i + 2 < m.length; i += 3) {
      [x0, x1] = [Math.min(x0, m[i] ?? 0), Math.max(x1, m[i] ?? 0)];
      [y0, y1] = [Math.min(y0, m[i + 1] ?? 0), Math.max(y1, m[i + 1] ?? 0)];
      [z0, z1] = [Math.min(z0, m[i + 2] ?? 0), Math.max(z1, m[i + 2] ?? 0)];
    }
    for (const slab of s.slabs) {
      z0 = Math.min(z0, slab.z0);
      z1 = Math.max(z1, slab.z1);
      for (const poly of slab.shape)
        for (const [x, y] of poly[0] ?? []) {
          x0 = Math.min(x0, x);
          x1 = Math.max(x1, x);
          y0 = Math.min(y0, y);
          y1 = Math.max(y1, y);
        }
    }
  }
  return x0 <= x1 ? { min: { x: x0, y: y0, z: z0 }, max: { x: x1, y: y1, z: z1 } } : null;
}
