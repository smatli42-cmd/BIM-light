// Tělesa vrstev střechy (3D a řez): každá rovina × každá vrstva skladby = hranol mezi dvěma rovnoběžnými
// plochami (odsazení kolmo k referenční rovině). Vrcholy plochy v odsazení d = průsečík roviny s hranicemi
// v témže odsazení: sousední rovina (nároží, hřeben, úžlabí – spoj v ose úhlu), štít (svislá rovina za
// přesahem) a okap podle úhlu řezu (svisle, kolmo k rovině, vodorovně v úrovni horního líce na okapu).
import type { Id } from '../ids/index.ts';
import type { Model } from '../model/types.ts';
import type { Vec3 } from '../covering/frame.ts';
import type { EdgeLine } from './edge-lines.ts';
import { roofGeometry, type RoofBound, type RoofGeometry, type RoofPlane } from './planes.ts';
import { roofLayerOffsets, roofLayers } from './queries.ts';
import { triangulate } from './triangulate.ts';
import type { Roof } from './types.ts';

interface Plane3 {
  readonly n: Vec3;
  readonly k: number;
}

export interface RoofSolid {
  readonly elementId: Id;
  readonly materialId: Id;
  readonly core: boolean;
  /** Hrana obrysu, ze které rovina vychází. */
  readonly plane: number;
  readonly layer: number;
  /** Spodní a horní plocha vrstvy (stejný počet vrcholů, proti směru hodin v půdorysu). */
  readonly bottom: readonly Vec3[];
  readonly top: readonly Vec3[];
}

const dot3 = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z;

function solve(a: Plane3, b: Plane3, c: Plane3): Vec3 | null {
  const det =
    a.n.x * (b.n.y * c.n.z - b.n.z * c.n.y) -
    a.n.y * (b.n.x * c.n.z - b.n.z * c.n.x) +
    a.n.z * (b.n.x * c.n.y - b.n.y * c.n.x);
  if (Math.abs(det) < 1e-6) return null;
  const col = (k: [number, number, number], i: 0 | 1 | 2) => {
    const m = [a, b, c].map((p, r) => [p.n.x, p.n.y, p.n.z].map((v, j) => (j === i ? k[r] : v)));
    const [r0, r1, r2] = m as [number[], number[], number[]];
    return (
      (r0[0] as number) * ((r1[1] as number) * (r2[2] as number) - (r1[2] as number) * (r2[1] as number)) -
      (r0[1] as number) * ((r1[0] as number) * (r2[2] as number) - (r1[2] as number) * (r2[0] as number)) +
      (r0[2] as number) * ((r1[0] as number) * (r2[1] as number) - (r1[1] as number) * (r2[0] as number))
    );
  };
  const k: [number, number, number] = [a.k, b.k, c.k];
  return { x: col(k, 0) / det, y: col(k, 1) / det, z: col(k, 2) / det };
}

class Planes {
  constructor(
    readonly geo: RoofGeometry,
    readonly cut: Roof['eaveCut'],
    readonly topD: number,
  ) {}

  face(i: number, d: number): Plane3 {
    const p = this.geo.planes.find((q) => q.edge === i) as RoofPlane;
    const e = this.geo.edges[i] as EdgeLine;
    return { n: p.normal, k: dot3(p.normal, { x: e.a.x, y: e.a.y, z: this.geo.refZ + e.lift }) + d };
  }

  eave(p: RoofPlane): Plane3 {
    const e = this.geo.edges[p.edge] as EdgeLine;
    const k = e.c - e.overhang;
    const E = { x: e.n.x * k, y: e.n.y * k, z: p.eaveZ };
    if (this.cut === 'horizontal') return { n: { x: 0, y: 0, z: 1 }, k: p.eaveZ + this.topD / p.normal.z };
    if (this.cut === 'perpendicular') {
      const s = Math.hypot(e.n.x, e.n.y, e.tan);
      const u = { x: e.n.x / s, y: e.n.y / s, z: e.tan / s };
      return { n: u, k: dot3(u, E) };
    }
    return { n: { x: e.n.x, y: e.n.y, z: 0 }, k };
  }

  bound(p: RoofPlane, b: RoofBound, d: number): Plane3 {
    if (b.kind === 'eave') return this.eave(p);
    if (b.kind === 'plane') return this.face(b.plane, d);
    const e = this.geo.edges[b.edge] as EdgeLine;
    return { n: { x: e.n.x, y: e.n.y, z: 0 }, k: e.c - e.overhang };
  }

  /**
   * Roh okapu mezi rovinou p a sousední rovinou j (nároží / úžlabí končí v rohu obrysu okapu): při různých
   * sklonech je nároží odsazené vrstvy posunuté i vodorovně a okap každé roviny ho protne jinde. Obě roviny
   * proto vezmou týž bod – střed mezi oběma průsečíky na nároží vrstvy (symetrické, spoj bez mezery).
   */
  eaveCorner(p: RoofPlane, j: number, d: number): Vec3 | null {
    const other = this.geo.planes.find((q) => q.edge === j);
    if (!other) return null;
    const own = this.face(p.edge, d);
    const theirs = this.face(j, d);
    const a = solve(own, theirs, this.eave(p));
    const b = solve(own, theirs, this.eave(other));
    return a && b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 } : null;
  }

  /** Plocha roviny p v odsazení d (kolmo, mm). */
  surface(p: RoofPlane, d: number): Vec3[] {
    const n = p.polygon.length;
    const own = this.face(p.edge, d);
    return p.polygon.map((v, k) => {
      const bin = p.bounds[(k + n - 1) % n] as RoofBound;
      const bout = p.bounds[k] as RoofBound;
      const pair =
        bin.kind === 'plane' && bout.kind === 'eave'
          ? bin.plane
          : bout.kind === 'plane' && bin.kind === 'eave'
            ? bout.plane
            : null;
      // Společný roh jen v rohu obrysu okapu (bod leží i na okapové čáře sousední roviny).
      const oe = pair !== null ? this.geo.edges[pair] : undefined;
      const j = oe && Math.abs(oe.n.x * v.x + oe.n.y * v.y - (oe.c - oe.overhang)) < 1 ? pair : null;
      const x =
        (j !== null ? this.eaveCorner(p, j, d) : null) ??
        solve(own, this.bound(p, bin, d), this.bound(p, bout, d));
      const lim = Math.max(2000, 20 * Math.abs(d));
      if (x && Math.hypot(x.x - v.x, x.y - v.y) < lim) return x;
      return { x: v.x, y: v.y, z: v.z + d / p.normal.z };
    });
  }
}

export function roofSolids(
  model: Model,
  roof: Roof,
  geo: RoofGeometry = roofGeometry(model, roof),
): RoofSolid[] {
  const layers = roofLayers(model, roof);
  const D = roofLayerOffsets(layers);
  const pl = new Planes(geo, roof.eaveCut, D.at(-1) ?? 0);
  return geo.planes.flatMap((p) => {
    const surf = D.map((d) => pl.surface(p, d));
    return layers.map((l, k) => ({
      elementId: roof.id,
      materialId: l.materialId,
      core: l.function === 'core',
      plane: p.edge,
      layer: k,
      bottom: surf[k] as Vec3[],
      top: surf[k + 1] as Vec3[],
    }));
  });
}

/** Trojúhelníky povrchu tělesa (normály ven): spodek, vršek a boky. */
export function solidTriangles(s: Pick<RoofSolid, 'bottom' | 'top'>): [Vec3, Vec3, Vec3][] {
  const tris = triangulate(s.top);
  const out: [Vec3, Vec3, Vec3][] = [];
  for (const [a, b, c] of tris) {
    out.push([s.top[a], s.top[b], s.top[c]] as [Vec3, Vec3, Vec3]);
    out.push([s.bottom[a], s.bottom[c], s.bottom[b]] as [Vec3, Vec3, Vec3]);
  }
  const n = s.bottom.length;
  for (let m = 0; m < n; m++) {
    const [b0, b1] = [s.bottom[m], s.bottom[(m + 1) % n]] as [Vec3, Vec3];
    const [t0, t1] = [s.top[m], s.top[(m + 1) % n]] as [Vec3, Vec3];
    out.push([b0, b1, t1], [b0, t1, t0]);
  }
  return out;
}
