// Vážený straight skeleton (rovné kostry, rozhodnutí 11): hrany obrysu se posouvají dovnitř, každá svou
// rychlostí (vodorovný posun na 1 mm výšky = 1 / tg sklonu; štít = 0, stojí). Čas = výška nad referenční
// čárou. Vrcholy vlny putují po nárožích a úžlabích; události: hrana zmizí (edge event), vrchol úžlabí
// narazí do protější hrany a vlnu rozdělí (split event). Vlna s nulovou plochou = hřebeny. Výsledek:
// trasy vrcholů (oblouky mezi rovinami dvou hran) a pro každou hranu úsečky hranice její roviny.
import { add, cross, dist, dot, mid, mul, norm, sub, type Vec2 } from '../geometry/index.ts';
import { signedArea } from '../slab/geometry.ts';
import type { Vec3 } from '../covering/frame.ts';

export type { Vec3 };

/** Úsečka kostry mezi rovinami hran `faces`; `convex` = nároží / hřeben, jinak úžlabí. */
export interface SkeletonArc {
  readonly a: Vec3;
  readonly b: Vec3;
  readonly faces: readonly [number, number];
  readonly convex: boolean;
}

export interface Skeleton {
  readonly arcs: readonly SkeletonArc[];
  /** Pro každou hranu úsečky hranice její roviny (bez samotné hrany obrysu). */
  readonly faceSegs: readonly (readonly (readonly [Vec3, Vec3])[])[];
}

interface Edge {
  readonly d: Vec2;
  readonly n: Vec2;
  readonly c: number;
  readonly v: number;
}

interface Vx {
  readonly p: Vec2;
  readonly t0: number;
  readonly w: Vec2;
  readonly ein: number;
  readonly eout: number;
  readonly reflex: boolean;
  readonly degenerate: boolean;
}

type Ev =
  | { t: number; kind: 'edge'; lav: number; i: number }
  | { t: number; kind: 'split'; lav: number; iv: number; j: number };

const EPS = 1e-3;
const P3 = (p: Vec2, z: number): Vec3 => ({ x: p.x, y: p.y, z });
const pos = (v: Vx, t: number): Vec2 => add(v.p, mul(v.w, t - v.t0));

function makeEdges(pts: readonly Vec2[], speeds: readonly number[]): Edge[] {
  return pts.map((p, i) => {
    const q = pts[(i + 1) % pts.length] as Vec2;
    const d = norm(sub(q, p));
    const n = { x: -d.y, y: d.x };
    return { d, n, c: dot(n, p), v: speeds[i] ?? 0 };
  });
}

function vertex(E: readonly Edge[], ein: number, eout: number, p: Vec2, t: number): Vx {
  const a = E[ein] as Edge;
  const b = E[eout] as Edge;
  const det = cross(a.n, b.n);
  const reflex = cross(a.d, b.d) < -1e-9;
  if (Math.abs(det) > 1e-9) {
    const w = { x: (a.v * b.n.y - b.v * a.n.y) / det, y: (a.n.x * b.v - b.n.x * a.v) / det };
    return { p, t0: t, w, ein, eout, reflex, degenerate: false };
  }
  // Rovnoběžné hrany: stejný směr = vrchol jde s hranou, protisměr = hřeben (vrchol stojí).
  const same = dot(a.n, b.n) > 0;
  return { p, t0: t, w: same ? mul(a.n, a.v) : { x: 0, y: 0 }, ein, eout, reflex, degenerate: !same };
}

class Wave {
  readonly arcs: SkeletonArc[] = [];
  readonly faceSegs: [Vec3, Vec3][][];
  lavs: Vx[][];
  now = 0;

  constructor(
    readonly E: readonly Edge[],
    pts: readonly Vec2[],
  ) {
    const n = pts.length;
    this.faceSegs = pts.map(() => []);
    this.lavs = [pts.map((p, i) => vertex(E, (i + n - 1) % n, i, p, 0))];
  }

  private seg(face: number, a: Vec3, b: Vec3) {
    this.faceSegs[face]?.push([a, b]);
  }

  /** Trasa vrcholu od jeho vzniku do bodu P v čase t. */
  trace(v: Vx, P: Vec2, t: number) {
    const a = P3(v.p, v.t0);
    const b = P3(P, t);
    if (dist(v.p, P) < EPS && Math.abs(t - v.t0) < EPS) return;
    this.arcs.push({ a, b, faces: [v.ein, v.eout], convex: !v.reflex });
    this.seg(v.ein, a, b);
    this.seg(v.eout, a, b);
  }

  edgeEvent(L: Vx[], i: number, t: number): number | null {
    const A = L[i] as Vx;
    const B = L[(i + 1) % L.length] as Vx;
    const d = (this.E[A.eout] as Edge).d;
    const L0 = dot(sub(pos(B, this.now), pos(A, this.now)), d);
    const rate = dot(sub(B.w, A.w), d);
    const at = L0 < EPS ? this.now : rate < -1e-12 ? this.now + L0 / -rate : null;
    if (at === null || dist(pos(A, at), pos(B, at)) > 0.5) return null;
    return t < at ? null : at;
  }

  splitEvent(L: Vx[], iv: number, j: number, t: number): number | null {
    const V = L[iv] as Vx;
    const X = L[j] as Vx;
    const Y = L[(j + 1) % L.length] as Vx;
    if (X === V || Y === V) return null;
    const e = this.E[X.eout] as Edge;
    const s = dot(e.n, pos(V, this.now)) - (e.c + e.v * this.now);
    const rate = dot(e.n, V.w) - e.v;
    if (rate >= -1e-12 || s < -EPS) return null;
    const at = this.now + Math.max(s, 0) / -rate;
    if (at >= t) return null;
    const H = pos(V, at);
    const xa = pos(X, at);
    const along = dot(sub(H, xa), e.d);
    const Lt = dot(sub(pos(Y, at), xa), e.d);
    return Lt > EPS && along > -EPS && along < Lt + EPS ? at : null;
  }

  nextEvent(): Ev | null {
    let best: Ev | null = null;
    this.lavs.forEach((L, lav) => {
      L.forEach((V, i) => {
        const t = this.edgeEvent(L, i, best ? best.t + 1e-9 : Infinity);
        if (t !== null && (!best || t < best.t - 1e-9)) best = { t, kind: 'edge', lav, i };
      });
      L.forEach((V, iv) => {
        if (!V.reflex || V.degenerate) return;
        L.forEach((_, j) => {
          const t = this.splitEvent(L, iv, j, best ? best.t - 1e-9 : Infinity);
          if (t !== null) best = { t, kind: 'split', lav, iv, j };
        });
      });
    });
    return best;
  }

  applyEdge(L: Vx[], i: number, t: number) {
    const k = (i + 1) % L.length;
    const A = L[i] as Vx;
    const B = L[k] as Vx;
    const P = A.degenerate ? A.p : B.degenerate ? B.p : mid(pos(A, t), pos(B, t));
    this.trace(A, P, t);
    this.trace(B, P, t);
    const N = vertex(this.E, A.ein, B.eout, P, t);
    const out = L.filter((_, x) => x !== k);
    out[k < i ? i - 1 : i] = N;
    return [out];
  }

  applySplit(L: Vx[], iv: number, j: number, t: number) {
    const V = L[iv] as Vx;
    const e = (L[j] as Vx).eout;
    const P = pos(V, t);
    this.trace(V, P, t);
    const n = L.length;
    const walk = (from: number, to: number) => {
      const out: Vx[] = [];
      for (let x = from % n; x !== to % n; x = (x + 1) % n) out.push(L[x] as Vx);
      return out;
    };
    const one = [vertex(this.E, V.ein, e, P, t), ...walk(j + 1, iv)];
    const two = [vertex(this.E, e, V.eout, P, t), ...walk(iv + 1, j + 1)];
    return [one, two];
  }

  /** Vlna s nulovou plochou (nebo 2 vrcholy): zbylé úseky jsou hřebeny mezi protilehlými hranami. */
  collapse(L: Vx[], t: number) {
    const P = L.map((v) => pos(v, t));
    L.forEach((v, i) => this.trace(v, P[i] as Vec2, t));
    L.forEach((v, i) => {
      const a = P[i] as Vec2;
      const b = P[(i + 1) % L.length] as Vec2;
      if (dist(a, b) < EPS) return;
      this.seg(v.eout, P3(a, t), P3(b, t));
      const m = mid(a, b);
      const k = L.findIndex((u, x) => {
        const c = P[x] as Vec2;
        const d2 = P[(x + 1) % L.length] as Vec2;
        return x !== i && dist(c, m) + dist(m, d2) - dist(c, d2) < 0.5 && u.eout !== v.eout;
      });
      const f = k >= 0 ? (L[k] as Vx).eout : -1;
      if (f > v.eout) this.arcs.push({ a: P3(a, t), b: P3(b, t), faces: [v.eout, f], convex: true });
    });
  }

  run(tolArea: number) {
    for (let guard = 0; this.lavs.length && guard < 2000; guard++) {
      const ev = this.nextEvent();
      if (!ev) {
        this.lavs.forEach((L) => this.collapse(L, this.now));
        return;
      }
      this.now = Math.max(this.now, ev.t);
      const L = this.lavs[ev.lav] as Vx[];
      const next =
        ev.kind === 'edge' ? this.applyEdge(L, ev.i, this.now) : this.applySplit(L, ev.iv, ev.j, this.now);
      const rest = this.lavs.filter((_, x) => x !== ev.lav);
      this.lavs = [...rest];
      for (const nl of next) {
        const area = Math.abs(signedArea(nl.map((v) => pos(v, this.now))));
        if (nl.length <= 2 || area < tolArea) this.collapse(nl, this.now);
        else this.lavs.push(nl);
      }
    }
  }
}

/** Kostra obrysu proti směru hodin; `speeds[i]` = vodorovný posun hrany i na 1 mm výšky (štít 0). */
export function straightSkeleton(points: readonly Vec2[], speeds: readonly number[]): Skeleton {
  const E = makeEdges(points, speeds);
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const diag = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  const w = new Wave(E, points);
  w.run(1e-4 * diag);
  return { arcs: w.arcs, faceSegs: w.faceSegs };
}
