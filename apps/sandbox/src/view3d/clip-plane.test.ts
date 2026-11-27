import { describe, expect, it } from 'vitest';
import { cutSolids, cutTriangles, exactCut } from './clip-plane.ts';
import type { Solid } from './solids.ts';

const box: Solid = {
  elementId: 'w',
  materialId: null,
  color: '#888888',
  opacity: 1,
  slabs: [
    {
      z0: 0,
      z1: 3000,
      shape: [
        [
          [
            [0, 0],
            [4000, 0],
            [4000, 300],
            [0, 300],
            [0, 0],
          ],
        ],
      ],
    },
  ],
};

describe('3D náhled / kvalita: řez rovinou přesně, řezná plocha plná', () => {
  it('svislá rovina ořízne půdorys, vodorovná výšku; šikmá jen obrazem', () => {
    const v = { origin: { x: 1000, y: 0, z: 0 }, normal: { x: 1, y: 0, z: 0 } };
    const [cut] = cutSolids([box], v);
    const xs = cut!.slabs[0]!.shape[0]![0]!.map((p) => p[0]);
    expect(Math.min(...xs)).toBeCloseTo(1000, 3);
    const h = { origin: { x: 0, y: 0, z: 1200 }, normal: { x: 0, y: 0, z: -1 } };
    expect(cutSolids([box], h)[0]!.slabs[0]).toMatchObject({ z0: 0, z1: 1200 });
    expect(cutSolids([box], { ...h, normal: { x: 0, y: 0, z: 1 }, origin: { x: 0, y: 0, z: 5000 } })).toEqual(
      [],
    );
    expect(exactCut({ origin: v.origin, normal: { x: 0.6, y: 0, z: 0.8 } })).toBe(false);
  });

  it('povrch (trojúhelníky) se ořízne stejnou rovinou', () => {
    const tri = [0, 0, 0, 2000, 0, 0, 0, 0, 2000];
    const out = cutTriangles(tri, { origin: { x: 1000, y: 0, z: 0 }, normal: { x: -1, y: 0, z: 0 } });
    expect(Math.max(...out.filter((_, i) => i % 3 === 0))).toBeCloseTo(1000, 3);
  });
});
