// Řez ve 3D rovinou přesně (jako ořezový kvádr): tělesa jsou svislé hranoly, takže vodorovná rovina ořízne
// výšku pásu a svislá rovina půdorys (2D průnik s polorovinou, polygon-clipping). Řezná plocha je plná
// a má barvu vrstvy – vrstvy jsou vidět jen v řezu, jako v Archicadu. Šikmou rovinu (jen přes AI) takto
// oříznout nejde; tu ořízne až obraz (rovina ořezu materiálu). Vše v mm.
import polygonClipping, { type MultiPolygon } from 'polygon-clipping';
import type { CutPlane3d } from '@bim-light/core';
import type { Slab } from './slice.ts';
import type { Solid } from './solids.ts';

const EPS = 0.5;
/** Polorovina jako velký obdélník (mm) – model se do něj vždy vejde. */
const FAR = 1e7;

/** Rovina je svislá nebo vodorovná: ořízne se přesně. */
export const exactCut = (p: CutPlane3d): boolean =>
  Math.abs(p.normal.z) > 0.999 || Math.abs(p.normal.z) < 0.001;

/** Polorovina, která zůstane (ve směru normály), jako obdélník v půdorysu. */
function halfPlane(p: CutPlane3d): MultiPolygon {
  const len = Math.hypot(p.normal.x, p.normal.y);
  const [nx, ny] = [p.normal.x / len, p.normal.y / len];
  const [tx, ty] = [-ny, nx];
  const { x, y } = p.origin;
  const pt = (a: number, b: number): [number, number] => [x + tx * a + nx * b, y + ty * a + ny * b];
  return [[[pt(-FAR, 0), pt(FAR, 0), pt(FAR, FAR), pt(-FAR, FAR), pt(-FAR, 0)]]];
}

function cutSlab(s: Slab, p: CutPlane3d, half: MultiPolygon | null): Slab | null {
  if (!half) {
    const keepUp = p.normal.z > 0;
    const z0 = keepUp ? Math.max(s.z0, p.origin.z) : s.z0;
    const z1 = keepUp ? s.z1 : Math.min(s.z1, p.origin.z);
    return z1 - z0 < EPS ? null : { ...s, z0, z1 };
  }
  try {
    const shape = polygonClipping.intersection(s.shape, half);
    return shape.length ? { ...s, shape } : null;
  } catch {
    return null;
  }
}

/** Tělesa oříznutá svislou nebo vodorovnou rovinou; zůstane část ve směru normály. */
export function cutSolids(solids: readonly Solid[], p: CutPlane3d): Solid[] {
  const half = Math.abs(p.normal.z) > 0.999 ? null : halfPlane(p);
  return solids.flatMap((s) => {
    const slabs = s.slabs.map((x) => cutSlab(x, p, half)).filter((x): x is Slab => !!x);
    return slabs.length ? [{ ...s, slabs }] : [];
  });
}

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
