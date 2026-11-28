// Hrany střechy s druhem (rozhodnutí 11): okap, štít (štítová hrana), hřeben, nároží, úžlabí. Druh se určí
// z geometrie: sousední rovina za hranou leží níž než pokračování této roviny = vypouklá hrana (hřeben /
// nároží), výš = úžlabí. Nároží spojuje roviny sousedních hran obrysu, hřeben ostatní a vodorovné.
import type { Vec2 } from '../geometry/index.ts';
import type { EdgeLine } from './edge-lines.ts';
import type { RoofGeometry, RoofPlane } from './planes.ts';
import { planeZ } from './planes.ts';
import type { Vec3 } from './skeleton.ts';

export type RoofLineKind = 'eave' | 'gable' | 'ridge' | 'hip' | 'valley';
export const ROOF_LINE_KINDS: readonly RoofLineKind[] = ['eave', 'gable', 'ridge', 'hip', 'valley'];

export interface RoofLine {
  readonly kind: RoofLineKind;
  readonly a: Vec3;
  readonly b: Vec3;
  /** Indexy hran obrysu rovin po stranách (okap a štít jen jedna). */
  readonly planes: readonly number[];
}

function kindBetween(
  g: Pick<RoofGeometry, 'refZ' | 'edges'>,
  i: number,
  j: number,
  a: Vec3,
  b: Vec3,
  n: number,
): RoofLineKind {
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  // Krok 10 mm doprava od směru a→b = do sousední roviny (rovina i leží vlevo).
  const q: Vec2 = {
    x: (a.x + b.x) / 2 + ((b.y - a.y) / len) * 10,
    y: (a.y + b.y) / 2 - ((b.x - a.x) / len) * 10,
  };
  const convex = planeZ(g, i, q) > planeZ(g, j, q);
  if (!convex) return 'valley';
  const adjacent = Math.abs(i - j) === 1 || Math.abs(i - j) === n - 1;
  return adjacent && Math.abs(a.z - b.z) > 1 ? 'hip' : 'ridge';
}

export function classifyLines(
  planes: readonly RoofPlane[],
  edges: readonly EdgeLine[],
  g: Pick<RoofGeometry, 'refZ' | 'edges'>,
): RoofLine[] {
  const out: RoofLine[] = [];
  for (const p of planes) {
    p.polygon.forEach((a, k) => {
      const b = p.polygon[(k + 1) % p.polygon.length] as Vec3;
      if (Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) < 1) return;
      const bd = p.bounds[k];
      if (!bd || bd.kind === 'eave') out.push({ kind: 'eave', a, b, planes: [p.edge] });
      else if (bd.kind === 'gable') out.push({ kind: 'gable', a, b, planes: [p.edge] });
      else if (bd.plane > p.edge)
        out.push({
          kind: kindBetween(g, p.edge, bd.plane, a, b, edges.length),
          a,
          b,
          planes: [p.edge, bd.plane],
        });
    });
  }
  return out;
}
