// Roviny střechy z modelu (rozhodnutí 11, návrh S1): kostra obrysu referenční čáry (skeleton.ts), přesahy
// prodlouží roviny za referenční čáru (bod na hraně se posune o přesah ven, rohy v corners.ts),
// okap = výška ref. čáry − přesah × tg sklonu. Výsledek čte kresba, řez, 3D, dotaz roof.planes a později krov.
import { dot, type Vec2 } from '../geometry/index.ts';
import type { Model } from '../model/types.ts';
import { faceLoop, loopArea, simplifyLoop } from './faces.ts';
import { straightSkeleton, type Vec3 } from './skeleton.ts';
import { roofEdgeLines, type EdgeLine } from './edge-lines.ts';
import { cornerOf, effectiveEdges } from './corners.ts';
import { breakCorner, onBreak, splitHalfHip } from './halfhip.ts';
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
  return g.refZ + e.lift + e.tan * (dot(e.n, q) - e.c);
}

/** Kdo sdílí úsečku a→b: jiná rovina kostry, která má na své hranici její střed. */
function boundOf(
  loops: readonly (Vec3[] | null)[],
  i: number,
  a: Vec3,
  b: Vec3,
  gable: (j: number, a: Vec3, b: Vec3) => boolean,
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
  return gable(j, a, b) ? ({ kind: 'gable', edge: j } as const) : ({ kind: 'plane', plane: j } as const);
}

/** Body obrysu roviny f posunuté o přesah (rohy obrysu okapu, zlomy polovalby). */
function shiftLoop(
  edges: readonly EdgeLine[],
  face: readonly Vec3[],
  bounds: readonly RoofBound[],
  f: number,
) {
  const n = face.length;
  return face.map((p, k) => {
    const h = edges.findIndex((e) => onBreak(e, p));
    if (h < 0) return cornerOf(edges, p);
    const near = [bounds[(k + n - 1) % n], bounds[k]].find((b) => b?.kind === 'plane');
    const other = h === f ? (near?.kind === 'plane' ? near.plane : -1) : f;
    return breakCorner(edges, p, h, other);
  });
}

export function roofGeometry(model: Model, roof: Roof): RoofGeometry {
  const refZ = (model.storeys[roof.storeyId]?.elevation ?? 0) + roof.refOffset;
  const edges = effectiveEdges(roofEdgeLines(roof));
  const pts = roof.outline;
  const sk = straightSkeleton(
    pts,
    edges.map((e) => (e.gable && !e.halfhip ? 0 : 1 / e.tan)),
    edges.map((e) => e.lift),
  );
  const loops = pts.map((_, i) => faceLoop(sk, pts, i)).map((l) => (l ? simplifyLoop(l) : null));
  // Štít je hranice svislá; u polovalby jen část pod zlomem.
  const isGable = (j: number, a: Vec3, b: Vec3) => {
    const e = edges[j];
    return !!e?.gable && (!e.halfhip || Math.max(a.z, b.z) <= e.lift + 1);
  };
  const planes: RoofPlane[] = [];
  const gables: RoofGable[] = [];
  const g = { refZ, edges };
  loops.forEach((loop, i) => {
    const e = edges[i] as EdgeLine;
    if (!loop) return;
    let face: Vec3[] = loop;
    if (e.gable) {
      const part = e.halfhip ? splitHalfHip(loop, e.lift) : null;
      const wall = part ? part.gable : loop;
      if (Math.max(...wall.map((p) => p.z)) > 1)
        gables.push({ edge: i, polygon: wall.map((p) => ({ ...p, z: refZ + p.z })) });
      if (!part) return;
      face = part.hip;
    }
    const bounds: RoofBound[] = face.map((p, k) =>
      k === 0 ? { kind: 'eave' } : boundOf(loops, i, p, face[(k + 1) % face.length] as Vec3, isGable),
    );
    const polygon = shiftLoop(edges, face, bounds, i).map((q) => ({ x: q.x, y: q.y, z: planeZ(g, i, q) }));
    const sec = Math.sqrt(1 + e.tan * e.tan);
    const normal = { x: (-e.tan * e.n.x) / sec, y: (-e.tan * e.n.y) / sec, z: 1 / sec };
    const area = Math.abs(loopArea(polygon)) * sec;
    const eaveZ = e.halfhip ? (polygon[0]?.z ?? refZ) : refZ - e.overhang * e.tan;
    planes.push({ edge: i, slope: e.slope, polygon, bounds, normal, eaveZ, area });
  });
  return { refZ, planes, gables, edges, lines: classifyLines(planes, edges, g) };
}

export { rad };
