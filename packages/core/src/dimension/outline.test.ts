import { describe, expect, it } from 'vitest';
import { vec } from '../geometry/index.ts';
import { fixture, type Fixture } from '../testing/fixture.ts';
import { measureDimension } from './measure.ts';
import { pickOutlineRef } from './outline-pick.ts';
import type { LinearDimension, OutlineRef } from './types.ts';

const typeId = (f: Fixture, name: string) =>
  Object.values(f.model.slabTypes).find((t) => t.name === name)!.id;
const slabRef = (ownerId: string, k: { edge?: number; vertex?: number }): OutlineRef => ({
  outline: 'slab',
  ownerId,
  ...k,
});

/** Deska 6 × 4 m (body 0..3 od [0,0] proti směru hodin), otvor 1 × 2 m a stěna 1 m nad deskou. */
function scene() {
  const f = fixture();
  const rect = { a: vec(0, 0), b: vec(6000, 4000) };
  const [slab] = f.run('slab.create', { storeyId: f.storeyId, typeId: typeId(f, 'ŽB strop 250'), rect });
  const [hole] = f.run('slabOpening.create', {
    storeyId: f.storeyId,
    rect: { a: vec(1000, 1000), b: vec(2000, 3000) },
  });
  f.line(vec(0, 5000), vec(6000, 5000));
  return { f, slab: slab!, hole: hole! };
}
const linear = (f: Fixture, refs: unknown[]) =>
  f.run('dimension.create', { kind: 'linear', refs, viewId: f.viewId })[0] as string;
const dim = (f: Fixture, id: string) => f.model.dimensions[id] as LinearDimension;

describe('desky D4 / základ 28: kóty k hranám a rohům desky', () => {
  it('desky D4: kóta mezi protilehlými hranami desky = šířka; patří podlaží desky', () => {
    const { f, slab } = scene();
    const id = linear(f, [slabRef(slab, { edge: 0 }), slabRef(slab, { edge: 2 })]);
    expect(measureDimension(f.model, dim(f, id))).toBe(4000);
    expect(dim(f, id).storeyId).toBe(f.storeyId);
  });

  it('desky D4: hrana otvoru v desce ke hraně desky; posun otvoru kótu přepočítá (základ 4)', () => {
    const { f, slab, hole } = scene();
    const id = linear(f, [slabRef(slab, { edge: 3 }), { outline: 'slabOpening', ownerId: hole, edge: 3 }]);
    expect(measureDimension(f.model, dim(f, id))).toBe(1000);
    f.run('slabOpening.move', { openingIds: [hole], vector: vec(500, 0) });
    expect(measureDimension(f.model, dim(f, id))).toBe(1500);
  });

  it('desky D4: roh s hranou měří kolmo k hraně; dva rohy větší z os X / Y', () => {
    const { f, slab, hole } = scene();
    const a = linear(f, [slabRef(slab, { vertex: 0 }), { outline: 'slabOpening', ownerId: hole, edge: 1 }]);
    expect(measureDimension(f.model, dim(f, a))).toBe(2000);
    const b = linear(f, [slabRef(slab, { vertex: 0 }), { outline: 'slabOpening', ownerId: hole, vertex: 2 }]);
    expect(measureDimension(f.model, dim(f, b))).toBe(3000);
  });

  it('desky D4: kóta ke stěně a hraně desky; změna čísla posune desku (i s otvorem jen v ní)', () => {
    const { f, slab, hole } = scene();
    const wall = Object.values(f.model.elements).find((e) => e.category === 'wall')!.id;
    const id = linear(f, [{ wallId: wall, face: 'ref' }, slabRef(slab, { edge: 2 })]);
    const before = measureDimension(f.model, dim(f, id));
    f.run('dimension.setValue', { dimensionId: id, value: before + 300, moveRef: 1 });
    expect(measureDimension(f.model, dim(f, id))).toBeCloseTo(before + 300, 3);
    expect(f.model.slabOpenings[hole]?.outline[0]?.y).toBeCloseTo(1000 - 300, 3);
  });

  it('desky D4: smazání desky nebo změna počtu bodů obrysu smaže kótu k její hraně', () => {
    const { f, slab, hole } = scene();
    const a = linear(f, [slabRef(slab, { edge: 0 }), slabRef(slab, { edge: 2 })]);
    const b = linear(f, [slabRef(slab, { edge: 3 }), slabRef(slab, { edge: 1 })]);
    const c = linear(f, [slabRef(slab, { edge: 0 }), { outline: 'slabOpening', ownerId: hole, vertex: 3 }]);
    f.run('slab.setOutline', { slabId: slab, outline: [vec(0, 0), vec(6000, 0), vec(6000, 4000)] });
    expect(f.model.dimensions[b]).toBeUndefined();
    expect(f.model.dimensions[a]).toBeDefined();
    f.run('selection.delete', { slabOpeningIds: [hole] });
    expect(f.model.dimensions[c]).toBeUndefined();
    f.run('selection.delete', { slabIds: [slab] });
    expect(f.model.dimensions[a]).toBeUndefined();
  });

  it('desky D4: řada kót z nástroje (dimension.createSet) přijme hrany desky', () => {
    const { f, slab, hole } = scene();
    const items = [
      {
        kind: 'linear',
        refs: [slabRef(slab, { edge: 3 }), { outline: 'slabOpening', ownerId: hole, edge: 3 }],
        ownerRef: 1,
      },
      {
        kind: 'linear',
        refs: [{ outline: 'slabOpening', ownerId: hole, edge: 3 }, slabRef(slab, { vertex: 1 })],
        ownerRef: 1,
      },
    ];
    const ids = f.run('dimension.createSet', { viewId: f.viewId, items, point: vec(0, 5000) });
    expect(ids.map((id) => measureDimension(f.model, dim(f, id)))).toEqual([1000, 5000]);
  });

  it('desky D4: neplatná hrana se odmítne; hrany různoběžné nejdou', () => {
    const { f, slab } = scene();
    const bad = (refs: unknown[]) =>
      f.editor.execute('dimension.create', { kind: 'linear', refs, viewId: f.viewId });
    expect(bad([slabRef(slab, { edge: 9 }), slabRef(slab, { edge: 0 })]).ok).toBe(false);
    expect(bad([slabRef(slab, { edge: 0 }), slabRef(slab, { edge: 1 })]).ok).toBe(false);
  });

  it('desky D4: nástroj Kóta – roh má přednost před hranou, otvor před deskou', () => {
    const { f, slab, hole } = scene();
    const view = f.model.views[f.viewId]!;
    expect(pickOutlineRef(f.model, view, vec(10, 5), 50)?.ref).toEqual(slabRef(slab, { vertex: 0 }));
    expect(pickOutlineRef(f.model, view, vec(3000, 20), 50)?.ref).toEqual(slabRef(slab, { edge: 0 }));
    expect(pickOutlineRef(f.model, view, vec(1500, 1010), 50)?.ref).toMatchObject({ ownerId: hole, edge: 0 });
    expect(pickOutlineRef(f.model, view, vec(3000, 2000), 50)).toBeNull();
  });
});
