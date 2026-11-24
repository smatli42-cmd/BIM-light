// Motiv šrafy (rodina „motif“): křivky v mm na papíře opakované v rastru. Jádro spočítá lomené čáry
// v místních souřadnicích rodiny (u po směru úhlu, v kolmo); kreslení je jen převede na obrazovku.
import type { Vec2 } from '../geometry/index.ts';
import type { MotifCurve, MotifFamily } from './types.ts';

/** Počet úseků vyhlazené křivky mezi dvěma body. */
const SMOOTH_STEPS = 8;
/** Nejvýš tolik opakování motivu na jednu plochu (ochrana před zamrznutím při malém zoomu). */
export const MAX_MOTIF_CELLS = 20000;

/** Bod Catmull-Rom mezi p1 a p2 (t 0..1). */
function catmull(p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2, t: number): Vec2 {
  const t2 = t * t;
  const t3 = t2 * t;
  const f = (a: number, b: number, c: number, d: number) =>
    0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
  return { x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) };
}

/** Křivka motivu jako lomená čára (vyhlazená = hustě navzorkovaná, uzavřená = zpět na začátek). */
export function curvePoints(c: MotifCurve): Vec2[] {
  const pts = c.points.map((p) => ({ x: p.x, y: p.y }));
  const n = pts.length;
  if (n < 2) return pts;
  if (!c.smooth) return c.closed ? [...pts, pts[0] as Vec2] : pts;
  const at = (i: number): Vec2 =>
    c.closed ? (pts[(i + n) % n] as Vec2) : (pts[Math.max(0, Math.min(n - 1, i))] as Vec2);
  const out: Vec2[] = [];
  const segs = c.closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    for (let k = 0; k < SMOOTH_STEPS; k++)
      out.push(catmull(at(i - 1), at(i), at(i + 1), at(i + 2), k / SMOOTH_STEPS));
  }
  out.push(c.closed ? (out[0] as Vec2) : (pts[n - 1] as Vec2));
  return out;
}

/** Rozsah v místních souřadnicích rodiny (mm na papíře). */
export interface MotifRange {
  readonly u0: number;
  readonly u1: number;
  readonly v0: number;
  readonly v1: number;
}

/**
 * Lomené čáry všech opakování motivu, které mohou zasáhnout do rozsahu (s okrajem jedné buňky).
 * Příliš mnoho buněk = prázdný výsledek (kresba se při velkém oddálení vynechá).
 */
export function motifStrokes(f: MotifFamily, r: MotifRange): Vec2[][] {
  const shapes = f.curves.map(curvePoints).filter((c) => c.length >= 2);
  const [i0, i1] = [Math.floor(r.u0 / f.dx) - 1, Math.ceil(r.u1 / f.dx) + 1];
  const [j0, j1] = [Math.floor(r.v0 / f.dy) - 1, Math.ceil(r.v1 / f.dy) + 1];
  if ((i1 - i0 + 1) * (j1 - j0 + 1) > MAX_MOTIF_CELLS) return [];
  const out: Vec2[][] = [];
  for (let j = j0; j <= j1; j++) {
    const shift = Math.abs(j) % 2 === 1 ? f.rowShift : 0;
    for (let i = i0; i <= i1; i++) {
      const cx = i * f.dx + shift;
      const cy = j * f.dy;
      for (const s of shapes) out.push(s.map((p) => ({ x: cx + p.x, y: cy + p.y })));
    }
  }
  return out;
}
