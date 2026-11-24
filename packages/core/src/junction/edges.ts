// Hrany mnohoúhelníků a jejich sousedé. Body blíž než `WELD` se „svaří“ do jednoho, hrany se rozdělí
// v cizích bodech, které na nich leží (T-vrchol). Pak má každá dílčí hrana nejvýš jednoho souseda
// se stejnými koncovými body – podle něj se rozhodne, jestli je to obrys, hranice vrstev, nebo nic.
import { dist, dot, sub, type Vec2 } from '../geometry/index.ts';
import { signedArea } from './half-plane.ts';

/** Tolerance svaření bodů (mm). */
export const WELD = 1e-3;

/** Dílčí hrana mnohoúhelníku `owner` z bodu `ia` do `ib` (indexy svařených bodů). */
export interface SubEdge {
  readonly ia: number;
  readonly ib: number;
  readonly owner: number;
}

export interface EdgeSet {
  readonly points: readonly Vec2[];
  readonly edges: readonly SubEdge[];
}

class Welder {
  readonly points: Vec2[] = [];
  private readonly grid = new Map<string, number[]>();
  private key = (x: number, y: number) => `${x},${y}`;
  id(p: Vec2): number {
    const cx = Math.floor(p.x / WELD);
    const cy = Math.floor(p.y / WELD);
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++)
        for (const i of this.grid.get(this.key(cx + dx, cy + dy)) ?? [])
          if (dist(this.points[i] as Vec2, p) <= WELD) return i;
    const i = this.points.push(p) - 1;
    const k = this.key(cx, cy);
    this.grid.set(k, [...(this.grid.get(k) ?? []), i]);
    return i;
  }
}

/** Mřížka bodů pro rychlé hledání bodů ležících na hraně. */
class PointGrid {
  private readonly cells = new Map<string, number[]>();
  constructor(
    private readonly pts: readonly Vec2[],
    private readonly size = 500,
  ) {
    pts.forEach((p, i) => {
      const k = `${Math.floor(p.x / size)},${Math.floor(p.y / size)}`;
      this.cells.set(k, [...(this.cells.get(k) ?? []), i]);
    });
  }
  near(a: Vec2, b: Vec2): number[] {
    const s = this.size;
    const out: number[] = [];
    for (
      let x = Math.floor((Math.min(a.x, b.x) - WELD) / s);
      x <= Math.floor((Math.max(a.x, b.x) + WELD) / s);
      x++
    )
      for (
        let y = Math.floor((Math.min(a.y, b.y) - WELD) / s);
        y <= Math.floor((Math.max(a.y, b.y) + WELD) / s);
        y++
      )
        out.push(...(this.cells.get(`${x},${y}`) ?? []));
    return out;
  }
}

/** Body ležící uvnitř hrany a–b, seřazené od a. */
function splitPoints(pts: readonly Vec2[], grid: PointGrid, ia: number, ib: number): number[] {
  const a = pts[ia] as Vec2;
  const b = pts[ib] as Vec2;
  const ab = sub(b, a);
  const l2 = dot(ab, ab);
  if (l2 < WELD * WELD) return [];
  const hits: [number, number][] = [];
  for (const c of grid.near(a, b)) {
    if (c === ia || c === ib) continue;
    const t = dot(sub(pts[c] as Vec2, a), ab) / l2;
    if (t <= 0 || t >= 1) continue;
    const q = { x: a.x + ab.x * t, y: a.y + ab.y * t };
    if (dist(q, pts[c] as Vec2) <= WELD) hits.push([t, c]);
  }
  return hits.sort((x, y) => x[0] - y[0]).map((h) => h[1]);
}

/** Svaří body mnohoúhelníků (otočených proti směru hodin) a rozdělí hrany v T-vrcholech. */
export function subEdges(polys: readonly (readonly Vec2[])[]): EdgeSet {
  const w = new Welder();
  const rings = polys.map((poly) => {
    const ccw = signedArea(poly) >= 0 ? poly : [...poly].reverse();
    const ids = ccw.map((p) => w.id(p)).filter((id, i, arr) => id !== arr[(i + arr.length - 1) % arr.length]);
    return ids.length >= 3 ? ids : [];
  });
  const grid = new PointGrid(w.points);
  const edges: SubEdge[] = [];
  rings.forEach((ids, owner) => {
    ids.forEach((ia, k) => {
      const ib = ids[(k + 1) % ids.length] as number;
      const chain = [ia, ...splitPoints(w.points, grid, ia, ib), ib];
      for (let i = 0; i + 1 < chain.length; i++)
        edges.push({ ia: chain[i] as number, ib: chain[i + 1] as number, owner });
    });
  });
  return { points: w.points, edges };
}

/** Pro každou dílčí hranu index protější hrany (stejné body, jiný mnohoúhelník), nebo −1. */
export function neighbours(set: EdgeSet, accept: (a: number, b: number) => boolean = () => true): number[] {
  const byKey = new Map<string, number[]>();
  set.edges.forEach((e, i) => {
    const k = e.ia < e.ib ? `${e.ia}:${e.ib}` : `${e.ib}:${e.ia}`;
    byKey.set(k, [...(byKey.get(k) ?? []), i]);
  });
  return set.edges.map((e, i) => {
    const k = e.ia < e.ib ? `${e.ia}:${e.ib}` : `${e.ib}:${e.ia}`;
    const other = (byKey.get(k) ?? []).find((j) => j !== i && set.edges[j]?.owner !== e.owner);
    const o = other === undefined ? -1 : other;
    return o >= 0 && accept(e.owner, (set.edges[o] as SubEdge).owner) ? o : -1;
  });
}
