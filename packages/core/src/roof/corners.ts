// Rohy přesahu (hlášení uživatele 2026-11-28): obrys okapu je vždy uzavřený mnohoúhelník posunutých hran
// (roh C = průsečík okapových čar). Nároží / úžlabí (průsečík dvou rovin) jde z rohu referenční čáry ven
// a skončí tam, kde poprvé narazí na okapovou čáru jedné z rovin (bod P). Ta rovina končí v P; druhá
// rovina pokračuje z P po okapové čáře té první až do rohu C (jako vícerovinná střecha v Archicadu).
// Při stejném sklonu i přesahu je P = C.
import { dist, type Vec2 } from '../geometry/index.ts';
import type { EdgeLine } from './edge-lines.ts';

/** Průsečík přímek n1·x = k1 a n2·x = k2 v půdorysu; null = rovnoběžné. */
export function meet(n1: Vec2, k1: number, n2: Vec2, k2: number): Vec2 | null {
  const det = n1.x * n2.y - n1.y * n2.x;
  if (Math.abs(det) < 1e-9) return null;
  return { x: (k1 * n2.y - k2 * n1.y) / det, y: (n1.x * k2 - n2.x * k1) / det };
}

/** Body rohu pro rovinu hrany `f` v pořadí obrysu a hrana, po jejíž okapové čáře vede vložený úsek. */
export interface Corner {
  readonly pts: readonly Vec2[];
  /** Úsek pts[0] → pts[1] leží na okapové čáře této hrany (jen u dvou bodů). */
  readonly along?: number;
}

/** Průsečík nároží hran a, b (rovina a = rovina b) s okapovou čárou hrany e. */
function hipHit(a: EdgeLine, b: EdgeLine, e: EdgeLine): Vec2 | null {
  const m = { x: a.tan * a.n.x - b.tan * b.n.x, y: a.tan * a.n.y - b.tan * b.n.y };
  return meet(m, a.tan * a.c - b.tan * b.c, e.n, e.c - e.overhang);
}

/**
 * Posunutý bod obrysu roviny `f`; `start` = bod je začátek hrany f (roh s předchozí hranou), jinak konec.
 * Bod na jedné hraně se posune o její přesah ven; roh se štítem = průsečík posunutých přímek.
 */
export function cornerOf(edges: readonly EdgeLine[], q: Vec2, f: number, start: boolean): Corner {
  const on = edges.filter((e) => e.contains(q));
  const a = on[0];
  if (!a) return { pts: [q] };
  const b = on.find((e) => Math.abs(a.n.x * e.n.y - a.n.y * e.n.x) > 1e-6);
  if (!b) return { pts: [{ x: q.x - a.n.x * a.overhang, y: q.y - a.n.y * a.overhang }] };
  const C = meet(a.n, a.c - a.overhang, b.n, b.c - b.overhang) ?? q;
  const own = edges[f];
  if (a.gable || b.gable || !own || (own !== a && own !== b)) return { pts: [C] };
  const other = own === a ? b : a;
  const pOwn = hipHit(a, b, own);
  const pOther = hipHit(a, b, other);
  if (!pOwn || !pOther) return { pts: [C] };
  const tOwn = dist(q, pOwn);
  const tOther = dist(q, pOther);
  // Moje okapová čára je na nároží první: rovina končí v P.
  if (tOwn <= tOther + 0.5) return { pts: [pOwn] };
  // Nároží narazí nejdřív na okap druhé roviny: z P po jejím okapu do rohu C, pak můj okap.
  if (dist(pOther, C) < 0.5) return { pts: [C] };
  const along = edges.indexOf(other);
  return start ? { pts: [pOther, C], along } : { pts: [C, pOther], along };
}
