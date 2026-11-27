import { describe, expect, it } from 'vitest';
import { buildSample, findSample, sequentialIds, vec, type View } from '@bim-light/core';
import { fixture } from '../../../../packages/core/src/testing/fixture.ts';
import { clipSolids, solidsBounds } from './clip.ts';
import { modelSolids } from './scene-model.ts';
import { shapeArea } from './slice.ts';
import type { Solid } from './solids.ts';

const volume = (solids: readonly Solid[]) =>
  solids.reduce((v, s) => v + s.slabs.reduce((a, b) => a + shapeArea(b.shape) * (b.z1 - b.z0), 0), 0);

describe('3D náhled / ořezový kvádr (Section Box v Revitu)', () => {
  it('3D náhled / kvádr: ořízne stěnu na délku i výšku, řez je plné těleso', () => {
    const f = fixture();
    f.line(vec(0, 0), vec(6000, 0));
    const view = f.model.views[f.viewId] as View;
    const solids = modelSolids(f.model, view);
    const b = solidsBounds(solids)!;
    const box = { min: { ...b.min, x: 1000 }, max: { ...b.max, x: 3000, z: b.min.z + 1000 } };
    const cut = clipSolids(solids, box);
    expect(volume(cut)).toBeCloseTo(volume(solids) * (2000 / 6000) * (1000 / (b.max.z - b.min.z)), -3);
    expect(solidsBounds(cut)).toEqual(box);
  });

  it('3D náhled / kvádr: těleso celé mimo kvádr zmizí, kvádr přes vše nic nemění', () => {
    const f = fixture();
    f.line(vec(0, 0), vec(6000, 0));
    const solids = modelSolids(f.model, f.model.views[f.viewId] as View);
    const b = solidsBounds(solids)!;
    const away = { min: { ...b.min, x: 10_000 }, max: { ...b.max, x: 12_000 } };
    expect(clipSolids(solids, away)).toEqual([]);
    expect(volume(clipSolids(solids, b))).toBeCloseTo(volume(solids), -3);
  });
});

describe('3D náhled / rozsah podlaží (Filter and Cut Elements in 3D v Archicadu)', () => {
  it('3D náhled / podlaží: jen vybraná podlaží, null = všechna', () => {
    const m = buildSample(findSample('dum')!, sequentialIds());
    const v = Object.values(m.views)[0]!;
    const storeyOf = (s: Solid) => m.elements[s.elementId]!.storeyId;
    const all = new Set(modelSolids(m, v, null, null).map(storeyOf));
    expect(all.size).toBe(2);
    const first = [...all][0]!;
    const one = modelSolids(m, v, null, new Set([first]));
    expect(new Set(one.map(storeyOf))).toEqual(new Set([first]));
  });
});
