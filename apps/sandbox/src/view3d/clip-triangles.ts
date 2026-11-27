// Ořezový kvádr pro tenké plochy (povrchy místností): trojúhelníky se oříznou rovinami kvádru
// (Sutherland–Hodgman, každá ze 6 stěn zvlášť) a zbytek se rozloží zpět na trojúhelníky. Vše v mm.
import type { Box3D } from './clip.ts';

type P = [number, number, number];

/** Ořízne mnohoúhelník polorovinou: zůstane, kde sign·(p[axis] − k) ≥ 0. */
function clipPoly(poly: P[], axis: 0 | 1 | 2, k: number, sign: 1 | -1): P[] {
  const out: P[] = [];
  poly.forEach((a, i) => {
    const b = poly[(i + 1) % poly.length] as P;
    const da = sign * (a[axis] - k);
    const db = sign * (b[axis] - k);
    if (da >= 0) out.push(a);
    if (da >= 0 !== db >= 0) {
      const t = da / (da - db);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
    }
  });
  return out;
}

/** Trojúhelníky [x, y, z, …] oříznuté kvádrem; pořadí vrcholů (líc) zůstane. */
export function clipTriangles(pos: readonly number[], box: Box3D): number[] {
  const out: number[] = [];
  const keys = ['x', 'y', 'z'] as const;
  for (let i = 0; i + 8 < pos.length; i += 9) {
    let poly: P[] = [0, 3, 6].map((o) => [pos[i + o], pos[i + o + 1], pos[i + o + 2]] as P);
    for (const axis of [0, 1, 2] as const) {
      poly = clipPoly(poly, axis, box.min[keys[axis]], 1);
      poly = clipPoly(poly, axis, box.max[keys[axis]], -1);
    }
    for (let j = 1; j + 1 < poly.length; j++)
      out.push(...(poly[0] as P), ...(poly[j] as P), ...(poly[j + 1] as P));
  }
  return out;
}
