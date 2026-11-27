// Hranice volného prostoru mezi stěnami (místnosti, prvky stavby 9): obrysy stěn („plné“) a výklenky
// („prázdné“, vyříznuté ze stěn) se rozloží na úsečky, rozdělí v průsečících a ponechají se jen hrany,
// které mají na jedné straně stěnu a na druhé volný prostor. Hrany se otočí tak, aby volný prostor byl
// vlevo, a spojí do smyček. Smyčka proti směru hodin = obrys místnosti, po směru = ostrov (sloup, komín)
// nebo vnější obrys budovy. Jen výpočet, nic se neukládá (základ 4).
import { cross, dist, leftNormal, mul, norm, sub, add, type Vec2 } from '../geometry/index.ts';
import { pointInPolygon } from '../selection/pick.ts';
import { signedArea } from '../slab/geometry.ts';
import { VertexPool } from './vertex-pool.ts';

type Seg = readonly [Vec2, Vec2];
type Poly = readonly Vec2[];

/** Posun od hrany při zkoušce, co je po stranách (mm). */
const SIDE_EPS = 0.05;
/** Tolerance kolinearity a dotyku (mm). */
const TOL = 1e-6;

const edgesOf = (polys: readonly Poly[]): Seg[] =>
  polys.flatMap((p) =>
    p.map((a, i) => [a, p[(i + 1) % p.length] as Vec2] as const).filter(([a, b]) => dist(a, b) > TOL),
  );

/** Parametry bodů na úsečce `s`, ve kterých ji úsečka `o` protíná nebo se jí dotýká (0 < t < 1). */
function splitParams(s: Seg, o: Seg): number[] {
  const d = sub(s[1], s[0]);
  const e = sub(o[1], o[0]);
  const l2 = d.x * d.x + d.y * d.y;
  const den = cross(d, e);
  const w = sub(o[0], s[0]);
  if (Math.abs(den) <= TOL * Math.sqrt(l2 * (e.x * e.x + e.y * e.y))) {
    // Rovnoběžné: na úsečce leží konce druhé úsečky, jen když jsou kolineární.
    if (Math.abs(cross(d, w)) / Math.sqrt(l2) > 1e-4) return [];
    return [o[0], o[1]].map((p) => ((p.x - s[0].x) * d.x + (p.y - s[0].y) * d.y) / l2);
  }
  const t = cross(w, e) / den;
  const u = cross(w, d) / den;
  const eu = TOL / Math.sqrt(e.x * e.x + e.y * e.y);
  return u >= -eu && u <= 1 + eu ? [t] : [];
}

function splitAll(segs: readonly Seg[]): Seg[] {
  const out: Seg[] = [];
  type Box = readonly [number, number, number, number];
  const box: Box[] = segs.map(([a, b]) => [
    Math.min(a.x, b.x),
    Math.min(a.y, b.y),
    Math.max(a.x, b.x),
    Math.max(a.y, b.y),
  ]);
  segs.forEach((s, i) => {
    const ts = [0, 1];
    const bi = box[i] as Box;
    segs.forEach((o, j) => {
      const bj = box[j] as Box;
      if (i === j || bj[0] > bi[2] + 1 || bj[2] < bi[0] - 1 || bj[1] > bi[3] + 1 || bj[3] < bi[1] - 1) return;
      for (const t of splitParams(s, o)) if (t > 1e-9 && t < 1 - 1e-9) ts.push(t);
    });
    ts.sort((a, b) => a - b);
    const d = sub(s[1], s[0]);
    for (let k = 1; k < ts.length; k++) {
      out.push([add(s[0], mul(d, ts[k - 1] as number)), add(s[0], mul(d, ts[k] as number))]);
    }
  });
  return out;
}

/** Hrany hranice volného prostoru jako dvojice indexů vrcholů (volno vlevo). */
function boundaryEdges(
  solids: readonly Poly[],
  voids: readonly Poly[],
  pool: VertexPool,
): [number, number][] {
  const inside = (p: Vec2) =>
    solids.some((s) => pointInPolygon(p, s)) && !voids.some((v) => pointInPolygon(p, v));
  const seen = new Set<string>();
  const out: [number, number][] = [];
  for (const [a, b] of splitAll(edgesOf([...solids, ...voids]))) {
    const ia = pool.add(a);
    const ib = pool.add(b);
    const key = ia < ib ? `${ia}_${ib}` : `${ib}_${ia}`;
    if (ia === ib || seen.has(key)) continue;
    seen.add(key);
    const m = mul(add(a, b), 0.5);
    const n = mul(leftNormal(norm(sub(b, a))), SIDE_EPS);
    const left = inside(add(m, n));
    if (left === inside(sub(m, n))) continue;
    out.push(left ? [ib, ia] : [ia, ib]);
  }
  return out;
}

/** Úhel, o který se směr `from` otočí po směru hodin na směr `to` (0, 2π]. */
function cwTurn(from: Vec2, to: Vec2): number {
  const a = Math.atan2(from.y, from.x) - Math.atan2(to.y, to.x);
  const r = ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  return r < 1e-12 ? 2 * Math.PI : r;
}

/** Vypustí body uprostřed rovné hrany. */
function simplify(pts: Vec2[]): Vec2[] {
  return pts.filter((p, i) => {
    const a = pts[(i - 1 + pts.length) % pts.length] as Vec2;
    const b = pts[(i + 1) % pts.length] as Vec2;
    return Math.abs(cross(sub(p, a), sub(b, p))) / (dist(a, p) * dist(p, b) || 1) > 1e-9;
  });
}

/**
 * Smyčky hranice volného prostoru (volno vlevo): kladná plocha = obrys místnosti, záporná = ostrov
 * nebo vnější obrys budovy.
 */
export function freeSpaceLoops(solids: readonly Poly[], voids: readonly Poly[] = []): Vec2[][] {
  const pool = new VertexPool();
  const edges = boundaryEdges(solids, voids, pool);
  const outOf = new Map<number, number[]>();
  edges.forEach(([a], i) => outOf.set(a, [...(outOf.get(a) ?? []), i]));
  const used = new Set<number>();
  const loops: Vec2[][] = [];
  edges.forEach((_, start) => {
    if (used.has(start)) return;
    const pts: Vec2[] = [];
    let e = start;
    while (!used.has(e)) {
      used.add(e);
      const [a, b] = edges[e] as [number, number];
      pts.push(pool.at(a));
      const back = sub(pool.at(a), pool.at(b));
      const next = (outOf.get(b) ?? []).filter((k) => !used.has(k) || k === start);
      if (!next.length) break;
      const turn = (k: number) => cwTurn(back, sub(pool.at((edges[k] as [number, number])[1]), pool.at(b)));
      e = next.reduce((best, k) => (turn(k) < turn(best) ? k : best));
    }
    const loop = simplify(pts);
    if (loop.length >= 3 && Math.abs(signedArea(loop)) > 1) loops.push(loop);
  });
  return loops;
}
