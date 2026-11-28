// Rozklad mnohoúhelníku na trojúhelníky (ořezávání uší) v půdorysu – roviny střechy nejsou svislé, takže
// stačí souřadnice x, y. Vrací trojice indexů proti směru hodin.
import { cross, sub, type Vec2 } from '../geometry/index.ts';
import { signedArea } from '../slab/geometry.ts';

function inside(p: Vec2, a: Vec2, b: Vec2, c: Vec2): boolean {
  return (
    cross(sub(b, a), sub(p, a)) > 1e-9 &&
    cross(sub(c, b), sub(p, b)) > 1e-9 &&
    cross(sub(a, c), sub(p, c)) > 1e-9
  );
}

export function triangulate(pts: readonly Vec2[]): [number, number, number][] {
  const idx = pts.map((_, i) => i);
  if (signedArea(pts) < 0) idx.reverse();
  const out: [number, number, number][] = [];
  while (idx.length > 3) {
    const n = idx.length;
    let cut = -1;
    for (let k = 0; k < n && cut < 0; k++) {
      const [ia, ib, ic] = [idx[(k + n - 1) % n], idx[k], idx[(k + 1) % n]] as [number, number, number];
      const [a, b, c] = [pts[ia], pts[ib], pts[ic]] as [Vec2, Vec2, Vec2];
      if (cross(sub(b, a), sub(c, b)) <= 1e-9) continue;
      if (idx.some((j) => j !== ia && j !== ib && j !== ic && inside(pts[j] as Vec2, a, b, c))) continue;
      out.push([ia, ib, ic]);
      cut = k;
    }
    // Zdegenerovaný obrys (body v řadě): zbytek vějířem.
    if (cut < 0) {
      for (let k = 1; k + 1 < n; k++) out.push([idx[0], idx[k], idx[k + 1]] as [number, number, number]);
      return out;
    }
    idx.splice(cut, 1);
  }
  if (idx.length === 3) out.push(idx as [number, number, number]);
  return out;
}
