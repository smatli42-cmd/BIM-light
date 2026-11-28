// Řez ve 3D rovinou přesně (jako ořezový kvádr): tělesa jsou svislé hranoly, takže vodorovná rovina ořízne
// výšku pásu a svislá rovina půdorys (2D průnik s polorovinou, polygon-clipping). Řezná plocha je plná
// a má barvu vrstvy – vrstvy jsou vidět jen v řezu, jako v Archicadu. Šikmou rovinu (jen přes AI) takto
// oříznout nejde; tu ořízne až obraz (rovina ořezu materiálu). Vše v mm.
import { cutMeshSolid } from './clip-mesh.ts';
export { cutTriangles } from './clip-mesh.ts';
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
    if (s.mesh) {
      const cut = cutMeshSolid(s, [p]);
      return cut ? [cut] : [];
    }
    const slabs = s.slabs.map((x) => cutSlab(x, p, half)).filter((x): x is Slab => !!x);
    return slabs.length ? [{ ...s, slabs }] : [];
  });
}
