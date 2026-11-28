// Roviny střechy z modelu (rozhodnutí 11, návrh S1): kostra obrysu referenční čáry (skeleton.ts), přesahy
// prodlouží roviny za referenční čáru (bod na hraně se posune o přesah ven, roh = průsečík posunutých hran),
// okap = výška ref. čáry − přesah × tg sklonu. Výsledek čte kresba, řez, 3D, dotaz roof.planes a později krov.
import { dot, type Vec2 } from '../geometry/index.ts';
import type { Model } from '../model/types.ts';
import { faceLoop, loopArea, simplifyLoop } from './faces.ts';
import { straightSkeleton, type Vec3 } from './skeleton.ts';
import { roofEdgeLines, type EdgeLine } from './edge-lines.ts';
import { classifyLines, type RoofLine } from './lines.ts';
import type { Roof } from './types.ts';

/** Hranice roviny: okap, štít (hrana obrysu) nebo sousední rovina (index hrany obrysu). */
export type RoofBound =
  | { readonly kind: 'eave' }
  | { readonly kind: 'gable'; readonly edge: number }
  | { readonly kind: 'plane'; readonly plane: number };

export interface RoofPlane {
  /** Index hrany obrysu, ze které rovina vychází. */
  readonly edge: number;
  readonly slope: number;
  /** Obrys v referenční rovině (absolutní z), proti směru hodin v půdorysu, začíná okapem. */
  readonly polygon: readonly Vec3[];
  /** Hranice: `bounds[k]` = úsečka `polygon[k] → polygon[k+1]`. */
  readonly bounds: readonly RoofBound[];
  /** Jednotková normála nahoru. */
  readonly normal: Vec3;
  /** Výška okapu v referenční rovině (absolutní, mm). */
  readonly eaveZ: number;
  /** Plocha v rovině (mm²). */
  readonly area: number;
}

export interface RoofGable {
  readonly edge: number;
  /** Svislý trojúhelník (lichoběžník) štítu v referenční čáře, absolutní z. */
  readonly polygon: readonly Vec3[];
}

export interface RoofGeometry {
  /** Absolutní výška referenční čáry. */
  readonly refZ: number;
  readonly planes: readonly RoofPlane[];
  readonly lines: readonly RoofLine[];
  readonly gables: readonly RoofGable[];
  readonly edges: readonly EdgeLine[];
}

const rad = (deg: number) => (deg * Math.PI) / 180;

/** Výška referenční roviny hrany i v bodě půdorysu. */
export function planeZ(g: Pick<RoofGeometry, 'refZ' | 'edges'>, i: number, q: Vec2): number {
  const e = g.edges[i] as EdgeLine;
  return g.refZ + e.tan * (dot(e.n, q) - e.c);
}

/** Posun bodu na hraně obrysu o přesah ven (roh dvou hran = průsečík posunutých přímek). */
function shifted(edges: readonly EdgeLine[], q: Vec2): Vec2 {
  const on = edges.filter((e) => e.contains(q));
  const a = on[0];
  if (!a) return q;
  const b = on.find((e) => Math.abs(a.n.x * e.n.y - a.n.y * e.n.x) > 1e-6);
  if (!b) return { x: q.x - a.n.x * a.overhang, y: q.y - a.n.y * a.overhang };
  const ka = a.c - a.overhang;
  const kb = b.c - b.overhang;
  const det = a.n.x * b.n.y - a.n.y * b.n.x;
  return { x: (ka * b.n.y - kb * a.n.y) / det, y: (a.n.x * kb - b.n.x * ka) / det };
}

/** Kdo sdílí úsečku a→b: jiná rovina kostry, která má na své hranici její střed. */
function boundOf(
  loops: readonly (Vec3[] | null)[],
  i: number,
  a: Vec3,
  b: Vec3,
  gable: (j: number) => boolean,
) {
  const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const j = loops.findIndex(
    (l, k) =>
      k !== i &&
      !!l &&
      l.some((p, x) => {
        const q = l[(x + 1) % l.length] as Vec3;
        const len = Math.hypot(q.x - p.x, q.y - p.y);
        const d = Math.hypot(m.x - p.x, m.y - p.y) + Math.hypot(q.x - m.x, q.y - m.y) - len;
        return len > 1e-6 && d < 0.5;
      }),
  );
  if (j < 0) return { kind: 'eave' } as const;
  return gable(j) ? ({ kind: 'gable', edge: j } as const) : ({ kind: 'plane', plane: j } as const);
}

export function roofGeometry(model: Model, roof: Roof): RoofGeometry {
  const refZ = (model.storeys[roof.storeyId]?.elevation ?? 0) + roof.refOffset;
  const edges = roofEdgeLines(roof);
  const pts = roof.outline;
  const sk = straightSkeleton(
    pts,
    edges.map((e) => (e.gable ? 0 : 1 / e.tan)),
  );
  const raw = pts.map((_, i) => faceLoop(sk, pts, i));
  const loops = raw.map((l) => (l ? simplifyLoop(l) : null));
  const isGable = (j: number) => !!edges[j]?.gable;
  const planes: RoofPlane[] = [];
  const gables: RoofGable[] = [];
  loops.forEach((loop, i) => {
    const e = edges[i] as EdgeLine;
    if (!loop) return;
    if (e.gable) {
      if (Math.max(...loop.map((p) => p.z)) > 1)
        gables.push({ edge: i, polygon: loop.map((p) => ({ ...p, z: refZ + p.z })) });
      return;
    }
    const bounds: RoofBound[] = loop.map((p, k) =>
      k === 0 ? { kind: 'eave' } : boundOf(loops, i, p, loop[(k + 1) % loop.length] as Vec3, isGable),
    );
    const g = { refZ, edges };
    const polygon = loop.map((p) => {
      const q = shifted(edges, p);
      return { x: q.x, y: q.y, z: planeZ(g, i, q) };
    });
    const sec = Math.sqrt(1 + e.tan * e.tan);
    const normal = { x: (-e.tan * e.n.x) / sec, y: (-e.tan * e.n.y) / sec, z: 1 / sec };
    const area = Math.abs(loopArea(polygon)) * sec;
    planes.push({ edge: i, slope: e.slope, polygon, bounds, normal, eaveZ: refZ - e.overhang * e.tan, area });
  });
  return { refZ, planes, gables, edges, lines: classifyLines(planes, edges, { refZ, edges }) };
}

export { rad };
