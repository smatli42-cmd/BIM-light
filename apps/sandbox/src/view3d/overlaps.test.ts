import { describe, expect, it } from 'vitest';
import { buildSample, findSample, sequentialIds } from '@bim-light/core';
import polygonClipping, { type MultiPolygon } from 'polygon-clipping';
import { resolveOverlaps } from './overlaps.ts';
import { modelSolids } from './scene-model.ts';
import type { Solid } from './solids.ts';

const rect = (x0: number, y0: number, x1: number, y1: number): MultiPolygon => [
  [
    [
      [x0, y0],
      [x1, y0],
      [x1, y1],
      [x0, y1],
      [x0, y0],
    ],
  ],
];
const solid = (id: string, z0: number, z1: number, shape: MultiPolygon): Solid => ({
  elementId: id,
  materialId: null,
  color: '#888888',
  opacity: 1,
  slabs: [{ z0, z1, shape }],
});
const area = (mp: MultiPolygon) =>
  mp.reduce((s, poly) => {
    const r = poly[0] ?? [];
    let a = 0;
    for (let i = 0; i + 1 < r.length; i++) a += r[i]![0] * r[i + 1]![1] - r[i + 1]![0] * r[i]![1];
    return s + Math.abs(a) / 2;
  }, 0);

/** Objem průniku dvou těles (mm³) – po vyřešení má být nula. */
function overlap(a: Solid, b: Solid): number {
  let v = 0;
  for (const x of a.slabs)
    for (const y of b.slabs) {
      const h = Math.min(x.z1, y.z1) - Math.max(x.z0, y.z0);
      if (h <= 0.5) continue;
      v += area(polygonClipping.intersection(x.shape, y.shape)) * h;
    }
  return v;
}

describe('3D náhled / kvalita: tělesa se nepřekrývají (bez prolínání ploch)', () => {
  it('stěna prochází stropem: strop se v místě stěny vyřízne, stěna zůstane celá', () => {
    const wall = solid('w', 0, 3000, rect(0, 0, 6000, 465));
    const slab = solid('d', 2590, 2850, rect(0, 0, 6000, 4000));
    const [w, d] = resolveOverlaps([wall, slab], (id) => (id === 'w' ? 2 : 1));
    expect(w).toEqual(wall);
    expect(overlap(w!, d!)).toBe(0);
    expect(area(d!.slabs[0]!.shape)).toBeCloseTo(6000 * (4000 - 465), 0);
  });

  it('ukázkový dům: žádná stěna nemá společný objem s deskou', () => {
    const m = buildSample(findSample('dum')!, sequentialIds());
    const solids = modelSolids(m, Object.values(m.views3d)[0]!);
    const walls = solids.filter((s) => m.elements[s.elementId]?.category === 'wall');
    const slabs = solids.filter((s) => m.elements[s.elementId]?.category === 'slab');
    let total = 0;
    for (const w of walls) for (const d of slabs) total += overlap(w, d);
    expect(total).toBeLessThan(1e3);
  });
});
