// Rozklad kružnice na body po společné mřížce úhlů (Z5). Body kružnice o daném středu a poloměru leží
// vždy na stejných úhlech 2πk/N, ať je kreslí kterákoli stěna nebo vrstva. Díky tomu mají sousední kousky
// vrstev (i z různých stěn) na společné kružnici stejné body a hrany se dají spárovat (junction/edges).
// Chyba tětivy proti oblouku je nejvýš ARC_TOLERANCE (zadání Z5: do 1 mm v modelu).
import type { Vec2 } from './vec.ts';

/** Největší odchylka tětivy od oblouku (mm). */
export const ARC_TOLERANCE = 0.5;
/** Nejdelší krok mřížky (kvůli vzhledu malých oblouků). */
const MAX_STEP = (3 * Math.PI) / 180;

/** Počet dílků celé kružnice o poloměru `r`. */
export function gridCount(r: number): number {
  const rr = Math.round(r * 100) / 100;
  if (rr <= ARC_TOLERANCE) return 120;
  const step = Math.min(MAX_STEP, 2 * Math.acos(1 - ARC_TOLERANCE / rr));
  return Math.max(120, Math.ceil((2 * Math.PI) / step));
}

export const gridPoint = (c: Vec2, r: number, n: number, k: number): Vec2 => {
  const a = (2 * Math.PI * k) / n;
  return { x: c.x + r * Math.cos(a), y: c.y + r * Math.sin(a) };
};

/** Úhel v jednotkách mřížky (0..n). */
export function gridParam(c: Vec2, n: number, p: Vec2): number {
  let a = Math.atan2(p.y - c.y, p.x - c.x);
  if (a < 0) a += 2 * Math.PI;
  return (a / (2 * Math.PI)) * n;
}

/**
 * Bod kružnice ve směru úhlu `a`, ale na tětivě mřížky (ne na přesném oblouku). Stejný bod dá ořez
 * pásu vrstvy přímkou ze středu, takže kousky vrstev na sebe přesně navazují.
 */
export function chordPoint(c: Vec2, r: number, a: number): Vec2 {
  const n = gridCount(r);
  const k = Math.floor((((a / (2 * Math.PI)) * n) % n) + n) % n;
  const p = gridPoint(c, r, n, k);
  const q = gridPoint(c, r, n, k + 1);
  const u = { x: Math.cos(a), y: Math.sin(a) };
  const e = { x: q.x - p.x, y: q.y - p.y };
  const den = u.x * e.y - u.y * e.x;
  if (Math.abs(den) < 1e-12) return p;
  const t = ((p.x - c.x) * e.y - (p.y - c.y) * e.x) / den;
  return { x: c.x + u.x * t, y: c.y + u.y * t };
}

/**
 * Body oblouku od úhlu `a0` o středový úhel `sweep` (kladný = proti směru hodin): krajní body na
 * tětivách mřížky (chordPoint), uvnitř body mřížky.
 */
export function arcPoints(c: Vec2, r: number, a0: number, sweep: number): Vec2[] {
  const n = gridCount(r);
  const at = (a: number) => chordPoint(c, r, a);
  const k0 = (a0 / (2 * Math.PI)) * n;
  const k1 = ((a0 + sweep) / (2 * Math.PI)) * n;
  const pts: Vec2[] = [at(a0)];
  const near = 1e-6;
  if (sweep > 0) for (let k = Math.floor(k0 + near) + 1; k < k1 - near; k++) pts.push(gridPoint(c, r, n, k));
  else for (let k = Math.ceil(k0 - near) - 1; k > k1 + near; k--) pts.push(gridPoint(c, r, n, k));
  pts.push(at(a0 + sweep));
  return pts;
}
