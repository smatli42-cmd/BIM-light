// Oříznutí obecných těles (trojúhelníky a hrany, např. střecha) rovinou a ořezovým kvádrem.
import type { CutPlane3d } from '@bim-light/core';
import type { Solid } from './solids.ts';

type P = [number, number, number];

/** Trojúhelníky [x, y, z, …] oříznuté rovinou (zůstane strana ve směru normály). */
export function cutTriangles(pos: readonly number[], p: CutPlane3d): number[] {
  const { origin: o, normal: n } = p;
  const d = (q: P) => (q[0] - o.x) * n.x + (q[1] - o.y) * n.y + (q[2] - o.z) * n.z;
  const out: number[] = [];
  for (let i = 0; i + 8 < pos.length; i += 9) {
    const tri = [0, 3, 6].map((k) => pos.slice(i + k, i + k + 3) as P);
    const poly: P[] = [];
    tri.forEach((a, k) => {
      const b = tri[(k + 1) % 3] as P;
      const [da, db] = [d(a), d(b)];
      if (da >= 0) poly.push(a);
      if (da >= 0 !== db >= 0) {
        const t = da / (da - db);
        poly.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
      }
    });
    for (let j = 1; j + 1 < poly.length; j++)
      out.push(...(poly[0] as P), ...(poly[j] as P), ...(poly[j + 1] as P));
  }
  return out;
}

/** Úsečky [x, y, z, x, y, z, …] oříznuté rovinou (zůstane strana ve směru normály). */
export function cutSegments(pos: readonly number[], p: CutPlane3d): number[] {
  const { origin: o, normal: n } = p;
  const d = (i: number) =>
    ((pos[i] ?? 0) - o.x) * n.x + ((pos[i + 1] ?? 0) - o.y) * n.y + ((pos[i + 2] ?? 0) - o.z) * n.z;
  const out: number[] = [];
  for (let i = 0; i + 5 < pos.length; i += 6) {
    const [da, db] = [d(i), d(i + 3)];
    if (da < 0 && db < 0) continue;
    const a = pos.slice(i, i + 3);
    const b = pos.slice(i + 3, i + 6);
    const t = da / (da - db);
    const at = a.map((v, k) => v + ((b[k] ?? 0) - v) * t);
    out.push(...(da >= 0 ? a : at), ...(db >= 0 ? b : at));
  }
  return out;
}

/** Těleso s trojúhelníky oříznuté rovinami; null = nic nezbylo. */
export function cutMeshSolid(s: Solid, planes: readonly CutPlane3d[]): Solid | null {
  let mesh = s.mesh ?? [];
  let edges = s.edges ?? [];
  for (const p of planes) {
    mesh = cutTriangles(mesh, p);
    edges = cutSegments(edges, p);
  }
  return mesh.length ? { ...s, mesh, ...(s.edges && { edges }) } : null;
}

/** Roviny ořezového kvádru (zůstane vnitřek). */
export function boxPlanes(b: {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
}): CutPlane3d[] {
  return [
    { origin: b.min, normal: { x: 1, y: 0, z: 0 } },
    { origin: b.min, normal: { x: 0, y: 1, z: 0 } },
    { origin: b.min, normal: { x: 0, y: 0, z: 1 } },
    { origin: b.max, normal: { x: -1, y: 0, z: 0 } },
    { origin: b.max, normal: { x: 0, y: -1, z: 0 } },
    { origin: b.max, normal: { x: 0, y: 0, z: -1 } },
  ];
}
