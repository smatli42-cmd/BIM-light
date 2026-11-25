// Řez kružnicí (Z5): hranice vrstvy obloukové stěny je soustředná kružnice. Kružnice se bere jako
// mnohoúhelník na společné mřížce úhlů (geometry/arc-grid), takže body řezu leží přesně na tětivách,
// které kreslí sousední vrstva – hrany kousků se dají spárovat stejně jako u přímých stěn.
import {
  add,
  cross,
  dot,
  gridCount,
  gridParam,
  gridPoint,
  leftNormal,
  mul,
  norm,
  sub,
  type Vec2,
} from '../geometry/index.ts';

/** Vnitřek (`inside`) nebo vnějšek kružnice o středu `c` a poloměru `r`. */
export interface CircleCut {
  readonly c: Vec2;
  readonly r: number;
  readonly inside: boolean;
}

const chordOf = (h: CircleCut, n: number, k: number): [Vec2, Vec2] => [
  gridPoint(h.c, h.r, n, k),
  gridPoint(h.c, h.r, n, k + 1),
];

/** Vzdálenost od tětivy se znaménkem; kladná = strana, která zůstává. */
export function circleSide(h: CircleCut, x: Vec2): number {
  const n = gridCount(h.r);
  const k = Math.floor(gridParam(h.c, n, x)) % n;
  const [a, b] = chordOf(h, n, k);
  const s = dot(sub(x, a), leftNormal(norm(sub(b, a))));
  return h.inside ? s : -s;
}

/** Parametry t (0..1) průsečíků úsečky a→b s tětivami kružnice. */
function crossings(h: CircleCut, n: number, a: Vec2, b: Vec2): number[] {
  const ka = gridParam(h.c, n, a);
  const kb = gridParam(h.c, n, b);
  let span = kb - ka;
  if (span > n / 2) span -= n;
  if (span < -n / 2) span += n;
  const from = Math.floor(Math.min(ka, ka + span)) - 1;
  const to = Math.floor(Math.max(ka, ka + span)) + 1;
  const d = sub(b, a);
  const out: number[] = [];
  for (let k = from; k <= to; k++) {
    const [p, q] = chordOf(h, n, ((k % n) + n) % n);
    const e = sub(q, p);
    const den = cross(d, e);
    if (Math.abs(den) < 1e-12) continue;
    const t = cross(sub(p, a), e) / den;
    const u = cross(sub(p, a), d) / den;
    if (t > 1e-12 && t < 1 - 1e-12 && u >= -1e-12 && u <= 1 + 1e-12) out.push(t);
  }
  return out.sort((x, y) => x - y).filter((t, i, arr) => i === 0 || t - (arr[i - 1] as number) > 1e-12);
}

interface Run {
  readonly kept: boolean;
  readonly points: Vec2[];
}

/** Hranice mnohoúhelníku rozdělená na úseky, které zůstanou / zmizí. */
function runs(poly: readonly Vec2[], h: CircleCut, n: number): Run[] {
  const out: Run[] = [];
  const tol = -1e-9 * Math.max(1, h.r);
  poly.forEach((a, i) => {
    const b = poly[(i + 1) % poly.length] as Vec2;
    const ts = [0, ...crossings(h, n, a, b), 1];
    for (let j = 0; j + 1 < ts.length; j++) {
      const p = add(a, mul(sub(b, a), ts[j] as number));
      const q = add(a, mul(sub(b, a), ts[j + 1] as number));
      const kept = circleSide(h, mul(add(p, q), 0.5)) >= tol;
      const last = out[out.length - 1];
      if (last && last.kept === kept) last.points.push(q);
      else out.push({ kept, points: [p, q] });
    }
  });
  const first = out[0];
  const last = out[out.length - 1];
  if (out.length > 1 && first && last && first.kept === last.kept) {
    out[0] = { kept: first.kept, points: [...last.points, ...first.points.slice(1)] };
    out.pop();
  }
  return out;
}

/** Body mřížky mezi body x a y ve směru `dir` (+1 proti směru hodin). */
function walk(h: CircleCut, n: number, x: Vec2, y: Vec2, dir: 1 | -1): Vec2[] {
  const kx = gridParam(h.c, n, x);
  let ky = gridParam(h.c, n, y);
  if (dir > 0 && ky < kx) ky += n;
  if (dir < 0 && ky > kx) ky -= n;
  const pts: Vec2[] = [];
  const near = 1e-6;
  if (dir > 0)
    for (let k = Math.floor(kx + near) + 1; k < ky - near; k++) pts.push(gridPoint(h.c, h.r, n, k));
  else for (let k = Math.ceil(kx - near) - 1; k > ky + near; k--) pts.push(gridPoint(h.c, h.r, n, k));
  return pts;
}

function inside(poly: readonly Vec2[], q: Vec2): boolean {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i] as Vec2;
    const b = poly[j] as Vec2;
    if (a.y > q.y !== b.y > q.y && q.x < ((b.x - a.x) * (q.y - a.y)) / (b.y - a.y) + a.x) c = !c;
  }
  return c;
}

/** Úhlová vzdálenost z x do y ve směru `dir` (v jednotkách mřížky, 0..n). */
function gap(h: CircleCut, n: number, x: Vec2, y: Vec2, dir: 1 | -1): number {
  const d = (gridParam(h.c, n, y) - gridParam(h.c, n, x)) * dir;
  return ((d % n) + n) % n;
}

/**
 * Ořízne mnohoúhelník (proti směru hodin) řezem kružnicí. Výsledek může mít víc částí (pás přes
 * kružnici): z bodu výstupu se jde po kružnici k nejbližšímu bodu vstupu (Weiler–Atherton).
 */
export function clipCircle(poly: readonly Vec2[], h: CircleCut): Vec2[][] {
  if (poly.length < 3) return [];
  const n = gridCount(h.r);
  const rs = runs(poly, h, n);
  if (rs.every((r) => r.kept)) return [[...poly]];
  if (rs.every((r) => !r.kept)) {
    if (!h.inside || !inside(poly, gridPoint(h.c, h.r, n, 0))) return [];
    return [Array.from({ length: n }, (_, k) => gridPoint(h.c, h.r, n, k))];
  }
  const kept = rs.filter((r) => r.kept);
  const dir = h.inside ? 1 : -1;
  const used = new Set<Run>();
  const loops: Vec2[][] = [];
  for (const first of kept) {
    if (used.has(first)) continue;
    const out: Vec2[] = [];
    let cur: Run | undefined = first;
    while (cur && !used.has(cur)) {
      used.add(cur);
      out.push(...cur.points);
      const x = cur.points[cur.points.length - 1] as Vec2;
      let next: Run | undefined;
      let best = Infinity;
      for (const r of kept) {
        const d = gap(h, n, x, r.points[0] as Vec2, dir);
        if (d < best) [best, next] = [d, r];
      }
      if (!next) break;
      out.push(...walk(h, n, x, next.points[0] as Vec2, dir));
      cur = next;
    }
    loops.push(out);
  }
  return loops;
}
