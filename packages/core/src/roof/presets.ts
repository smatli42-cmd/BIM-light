// Předvolby tvaru střechy (rozhodnutí 11): jen předvyplní hrany obrysu – pultová (okap na první hraně,
// ostatní štíty), sedlová (štíty na kratších protilehlých hranách čtyřúhelníku), valbová (vše sklon).
import { dist, type Vec2 } from '../geometry/index.ts';
import type { RoofEdge, RoofShape } from './types.ts';

/** Hrany pro předvolbu; null = předvolba se na obrys nehodí (sedlová jen na čtyřúhelník). */
export function presetEdges(
  outline: readonly Vec2[],
  shape: RoofShape,
  slope: number,
  overhang: number,
): RoofEdge[] | null {
  const n = outline.length;
  const slopeEdge: RoofEdge = { kind: 'slope', slope, overhang };
  const gable: RoofEdge = { kind: 'gable', slope, overhang };
  if (shape === 'hip') return outline.map(() => slopeEdge);
  if (shape === 'shed') return outline.map((_, i) => (i === 0 ? slopeEdge : gable));
  if (n !== 4) return null;
  const len = (i: number) => dist(outline[i] as Vec2, outline[(i + 1) % n] as Vec2);
  const shortFirst = len(0) + len(2) <= len(1) + len(3);
  return outline.map((_, i) => ((i % 2 === 0) === shortFirst ? gable : slopeEdge));
}
