import { describe, expect, it } from 'vitest';
import { getSlab, slabLevels, vec, type View } from '@bim-light/core';
import { fixture, type Fixture } from '../../../../packages/core/src/testing/fixture.ts';
import { modelSolids, selectionElements } from './scene-model.ts';
import { shapeArea } from './slice.ts';
import { slabSolids } from './slab-solids.ts';

const typeId = (f: Fixture, name: string) =>
  Object.values(f.model.slabTypes).find((t) => t.name === name)!.id;
const rect = { a: { x: 0, y: 0 }, b: { x: 4000, y: 3000 } };
const make = (f: Fixture, name: string) =>
  f.run('slab.create', { storeyId: f.storeyId, typeId: typeId(f, name), rect })[0]!;
const view = (f: Fixture): View => f.model.views[f.viewId] as View;
const volume = (
  solids: readonly { slabs: readonly { z0: number; z1: number; shape: Parameters<typeof shapeArea>[0] }[] }[],
) => solids.reduce((v, s) => v + s.slabs.reduce((a, b) => a + shapeArea(b.shape) * (b.z1 - b.z0), 0), 0);

describe('3D náhled / desky (rozhodnutí sekce 5, D1)', () => {
  it('3D náhled / deska: vrstvy skladby zdola od spodního líce po horní líc, objem = plocha × tloušťka', () => {
    const f = fixture();
    const id = make(f, 'ŽB strop 250');
    const slab = getSlab(f.model, id);
    const lv = slabLevels(f.model, slab);
    const solids = slabSolids(f.model, slab);
    const comp = f.model.compositions[f.model.slabTypes[slab.typeId]!.compositionId]!;
    expect(solids).toHaveLength(comp.layers.length);
    expect(solids[0]!.slabs[0]!.z0).toBe(lv.bottom);
    expect(solids.at(-1)!.slabs.at(-1)!.z1).toBe(lv.top);
    const vol = solids.reduce(
      (v, s) => v + s.slabs.reduce((a, b) => a + shapeArea(b.shape) * (b.z1 - b.z0), 0),
      0,
    );
    expect(vol).toBeCloseTo(4000 * 3000 * lv.thickness, -3);
    solids.forEach((s, i) => {
      const m = f.model.materials[comp.layers[i]!.materialId!];
      expect(s.color).toBe(m?.color ?? '#c8c8c8');
      expect(s.elementId).toBe(id);
    });
  });

  it('3D náhled / desky: skrytá vrstva Desky zmizí i ve 3D, F4 ukáže vybranou desku', () => {
    const f = fixture();
    const id = make(f, 'ŽB strop 250');
    const ids = () => new Set(modelSolids(f.model, view(f)).map((s) => s.elementId));
    expect(ids().has(id)).toBe(true);
    const only = selectionElements(f.model, [], [], [id]);
    expect(new Set(modelSolids(f.model, view(f), only).map((s) => s.elementId))).toEqual(new Set([id]));
    for (const layerId of Object.keys(f.model.display.layers))
      f.run('view.setLayerState', { viewId: f.viewId, layerId, visible: false });
    expect(ids().has(id)).toBe(false);
  });

  it('základ 19 / D3 / 3D náhled: otvor v desce prořízne všechny vrstvy po celé tloušťce', () => {
    const f = fixture();
    const id = make(f, 'ŽB strop 250');
    const vol = () => volume(modelSolids(f.model, view(f)).filter((s) => s.elementId === id));
    const full = vol();
    const [hole] = f.run('slabOpening.create', {
      storeyId: f.storeyId,
      rect: { a: vec(1000, 1000), b: vec(2000, 3000) },
    });
    const t = slabLevels(f.model, getSlab(f.model, id)).thickness;
    expect(full - vol()).toBeCloseTo(1000 * 2000 * t, -3);
    // F4 na otvor ukáže desky, které prořízne.
    expect(selectionElements(f.model, [], [], [], [hole!])).toEqual(new Set([id]));
  });
});
