// Hrany prvku ve 3D (jako v Archicadu): obrys celého prvku, ne každé vrstvy zvlášť – vrstvy jsou vidět jen
// barvou v řezu. Pásy všech vrstev prvku se po výšce sloučí (2D sjednocení v každém výškovém intervalu)
// a hrany se spočítají z výsledku (view3d/edges.ts). Hrany schované uvnitř jiného tělesa (deska pod stěnou,
// styk stropu a zdi) se vynechají, aby neprosvítaly. Vše v mm.
import polygonClipping, { type MultiPolygon } from 'polygon-clipping';
import { slabEdges, type Segments } from './edges.ts';
import type { Slab } from './slice.ts';

const EPS = 0.5;
/** Hrana se kontroluje po kouscích nejvýš této délky (mm). */
const PIECE = 150;

function union(shapes: MultiPolygon[]): MultiPolygon {
  if (shapes.length < 2) return shapes[0] ?? [];
  try {
    return polygonClipping.union(...(shapes as [MultiPolygon, ...MultiPolygon[]]));
  } catch {
    return shapes[0] ?? [];
  }
}

/** Pásy prvku sloučené po výšce do souvislých řad (mezera ve výšce = nová řada). */
export function mergedBands(slabs: readonly Slab[]): Slab[][] {
  const zs = [...new Set(slabs.flatMap((s) => [s.z0, s.z1]))].sort((a, b) => a - b);
  const runs: Slab[][] = [];
  let run: Slab[] = [];
  for (let i = 0; i + 1 < zs.length; i++) {
    const [z0, z1] = [zs[i] as number, zs[i + 1] as number];
    const here = slabs.filter((s) => s.z0 <= z0 + EPS && s.z1 >= z1 - EPS).map((s) => s.shape);
    if (!here.length) {
      if (run.length) runs.push(run);
      run = [];
      continue;
    }
    run.push({ z0, z1, shape: union(here) });
  }
  if (run.length) runs.push(run);
  return runs;
}

type Ring2 = readonly (readonly number[])[];

/** Bod leží na obrysu (do EPS). */
function onRing(ring: Ring2, x: number, y: number): boolean {
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i] as [number, number];
    const [xj, yj] = ring[j] as [number, number];
    const len2 = (xj - xi) ** 2 + (yj - yi) ** 2;
    const t = len2 ? Math.max(0, Math.min(1, ((x - xi) * (xj - xi) + (y - yi) * (yj - yi)) / len2)) : 0;
    if (Math.hypot(xi + (xj - xi) * t - x, yi + (yj - yi) * t - y) < EPS) return true;
  }
  return false;
}

function crossings(ring: Ring2, x: number, y: number): number {
  let n = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i] as [number, number];
    const [xj, yj] = ring[j] as [number, number];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) n++;
  }
  return n;
}

/** Bod leží uvnitř pásu, ne na jeho povrchu (hrana na povrchu jiného tělesa zůstane vidět). */
export function inside(s: Slab, x: number, y: number, z: number): boolean {
  if (z <= s.z0 + EPS || z >= s.z1 - EPS) return false;
  const rings = s.shape.flat();
  if (rings.some((r) => onRing(r, x, y))) return false;
  return rings.reduce((n, r) => n + crossings(r, x, y), 0) % 2 === 1;
}

export interface Boxed {
  readonly slab: Slab;
  readonly box: Six;
}

export function boxed(s: Slab): Boxed {
  const pts = s.shape.flat(2) as unknown as [number, number][];
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return { slab: s, box: [Math.min(...xs), Math.min(...ys), s.z0, Math.max(...xs), Math.max(...ys), s.z1] };
}

type Six = readonly [number, number, number, number, number, number];

const overlaps = (b: Six, [x0, y0, z0, x1, y1, z1]: Six) =>
  b[0] <= Math.max(x0, x1) + EPS &&
  b[3] >= Math.min(x0, x1) - EPS &&
  b[1] <= Math.max(y0, y1) + EPS &&
  b[4] >= Math.min(y0, y1) - EPS &&
  b[2] <= Math.max(z0, z1) + EPS &&
  b[5] >= Math.min(z0, z1) - EPS;

/** Úsečky bez částí, které leží uvnitř těles `others`. */
export function hideInside(segs: Segments, all: readonly Boxed[]): Segments {
  if (!all.length) return segs;
  const out: Segments = [];
  for (let i = 0; i + 5 < segs.length; i += 6) {
    const seg = segs.slice(i, i + 6) as [number, number, number, number, number, number];
    const near = all.filter((b) => overlaps(b.box, seg)).map((b) => b.slab);
    if (!near.length) {
      out.push(...seg);
      continue;
    }
    const [x0, y0, z0, x1, y1, z1] = seg;
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0, z1 - z0) / PIECE));
    const at = (t: number) => [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, z0 + (z1 - z0) * t];
    let start = -1;
    for (let k = 0; k <= n; k++) {
      const [mx, my, mz] = at((k + 0.5) / n) as [number, number, number];
      const shown = k < n && !near.some((s) => inside(s, mx, my, mz));
      if (shown && start < 0) start = k;
      if (!shown && start >= 0) {
        out.push(...at(start / n), ...at(k / n));
        start = -1;
      }
    }
  }
  return out;
}

/** Hrany prvku z pásů všech jeho vrstev; `others` = pásy ostatních prvků s obálkou (`boxed`) – hrany uvnitř nich se skryjí. */
export function elementEdges(slabs: readonly Slab[], others: readonly Boxed[] = []): Segments {
  const own = mergedBands(slabs).flatMap((run) => slabEdges(run));
  return hideInside(own, others);
}
