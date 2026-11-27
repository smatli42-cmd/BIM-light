import { describe, expect, it } from 'vitest';
import { vec } from '@bim-light/core';
import { slabEdges } from './edges.ts';
import { sliceLayer } from './slice.ts';

/** Vodorovné úsečky ve výšce z (délky). */
function horizontalAt(seg: number[], z: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < seg.length; i += 6) {
    const [x0, y0, z0, x1, y1, z1] = seg.slice(i, i + 6) as [number, number, number, number, number, number];
    if (z0 === z && z1 === z) out.push(Math.hypot(x1 - x0, y1 - y0));
  }
  return out;
}

describe('3D náhled / hrany: jen skutečné hrany tělesa', () => {
  const rect = [vec(0, 0), vec(4000, 0), vec(4000, 300), vec(0, 300)];
  const hole = [vec(1000, -1), vec(2000, -1), vec(2000, 301), vec(1000, 301)];
  const slabs = sliceLayer([rect], 0, 3000, [{ footprint: hole, bottom: 900, top: 2400 }]);
  const seg = slabEdges(slabs);

  it('3D náhled / hrany: na parapetu jen hrany otvoru, ne čára přes celou fasádu', () => {
    const sill = horizontalAt(seg, 900);
    expect(sill.length).toBeGreaterThan(0);
    expect(Math.max(...sill)).toBeLessThanOrEqual(1000 + 1e-6);
    expect(sill.reduce((a, b) => a + b, 0)).toBeCloseTo(2 * 1000 + 2 * 300, 0);
  });

  it('3D náhled / hrany: spodek a vršek mají celý obrys, rohy svislé hrany', () => {
    expect(horizontalAt(seg, 0).reduce((a, b) => a + b, 0)).toBeCloseTo(2 * 4300);
    expect(horizontalAt(seg, 3000).reduce((a, b) => a + b, 0)).toBeCloseTo(2 * 4300);
    const vertical = [];
    for (let i = 0; i < seg.length; i += 6) if (seg[i + 2] !== seg[i + 5]) vertical.push(i);
    expect(vertical.length).toBeGreaterThanOrEqual(4 * 3);
  });
});
