// 3D tělesa střechy (rozhodnutí 11, S1) spočítaná jádrem (roof/solids.ts): každá rovina × vrstva skladby
// je obecné těleso (trojúhelníky) v barvě svého materiálu; hrany = obrys každé roviny (horní a spodní líc
// skladby a svislé spoje v rozích). Řez a ořezový kvádr ořízne trojúhelníky i hrany (clip-mesh.ts).
import { roofSolids, solidTriangles, type Model, type Roof, type Vec3 } from '@bim-light/core';
import { materialOpacity, type Solid } from './solids.ts';

const FALLBACK_COLOR = '#c8c8c8';
const flat = (pts: readonly Vec3[]) => pts.flatMap((p) => [p.x, p.y, p.z]);

/** Hrany obrysu roviny: horní líc, spodní líc a spojnice rohů. */
function planeEdges(bottom: readonly Vec3[], top: readonly Vec3[]): number[] {
  const out: number[] = [];
  const n = bottom.length;
  for (let k = 0; k < n; k++) {
    const k1 = (k + 1) % n;
    out.push(...flat([bottom[k] as Vec3, bottom[k1] as Vec3, top[k] as Vec3, top[k1] as Vec3]));
    out.push(...flat([bottom[k] as Vec3, top[k] as Vec3]));
  }
  return out;
}

export function roofSolids3d(model: Model, roof: Roof): Solid[] {
  const parts = roofSolids(model, roof);
  const last = Math.max(0, ...parts.map((p) => p.layer));
  return parts.map((p) => {
    const mat = model.materials[p.materialId];
    const top = parts.find((q) => q.plane === p.plane && q.layer === last);
    return {
      elementId: roof.id,
      materialId: p.materialId,
      color: mat?.color ?? FALLBACK_COLOR,
      opacity: materialOpacity(mat),
      slabs: [],
      mesh: solidTriangles(p).flatMap(flat),
      // Hrany jen jednou za rovinu (u spodní vrstvy): spodní líc skladby → horní líc.
      ...(p.layer === 0 && top && { edges: planeEdges(p.bottom, top.top) }),
    };
  });
}
