// Předvolby tvaru střechy (rozhodnutí 11): jen předvyplní hrany obrysu – pultová (okap na první hraně,
// ostatní štíty), sedlová (štíty na kratších protilehlých hranách čtyřúhelníku), valbová (vše sklon),
// polovalbová (kratší hrany čtyřúhelníku polovalba se zlomem v polovině výšky hřebene).
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
  if (shape === 'halfhip') return halfHip(outline, slope, overhang);
  const slopeEdge: RoofEdge = { kind: 'slope', slope, overhang };
  const gable: RoofEdge = { kind: 'gable', slope, overhang };
  if (shape === 'hip') return outline.map(() => slopeEdge);
  if (shape === 'shed') return outline.map((_, i) => (i === 0 ? slopeEdge : gable));
  if (n !== 4) return null;
  const len = (i: number) => dist(outline[i] as Vec2, outline[(i + 1) % n] as Vec2);
  const shortFirst = len(0) + len(2) <= len(1) + len(3);
  return outline.map((_, i) => ((i % 2 === 0) === shortFirst ? gable : slopeEdge));
}

/** Polovalbová: kratší protilehlé hrany čtyřúhelníku = polovalba, zlom v polovině výšky hřebene (po 10 mm). */
function halfHip(outline: readonly Vec2[], slope: number, overhang: number): RoofEdge[] | null {
  const n = outline.length;
  if (n !== 4) return null;
  const len = (i: number) => dist(outline[i] as Vec2, outline[(i + 1) % n] as Vec2);
  const shortFirst = len(0) + len(2) <= len(1) + len(3);
  const span = shortFirst ? (len(0) + len(2)) / 2 : (len(1) + len(3)) / 2;
  const ridge = (span / 2) * Math.tan((slope * Math.PI) / 180);
  const breakHeight = Math.max(10, Math.round(ridge / 2 / 10) * 10);
  return outline.map((_, i) =>
    (i % 2 === 0) === shortFirst
      ? { kind: 'halfhip', slope, overhang, breakHeight }
      : { kind: 'slope', slope, overhang },
  );
}
