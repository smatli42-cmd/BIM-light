import { describe, expect, it } from 'vitest';
import { vec } from '../geometry/index.ts';
import { openingTempDimensions } from '../opening/temporary.ts';
import { fixture, room } from '../testing/fixture.ts';
import { measureDimension } from './measure.ts';

const values = (f: ReturnType<typeof fixture>, ids: readonly string[]) =>
  ids.map((id) => Math.round(measureDimension(f.model, f.model.dimensions[id] as never)));

describe('plan-steny / Z4: kóty k otvorům', () => {
  it('kóta od líce k hraně otvoru drží při změně tloušťky stěny', () => {
    const f = fixture();
    const [left, top] = room(f);
    const [o] = f.run('opening.create', { wallId: top, offset: 1000, width: 900 });
    const [d] = f.run('dimension.create', {
      kind: 'linear',
      viewId: f.viewId,
      refs: [
        { wallId: left, face: 'ref' },
        { wallId: top, face: 'start', openingId: o },
      ],
    });
    expect(values(f, [d as string])).toEqual([1000]);
    f.run('wall.setThickness', { wallId: top, thickness: 450 });
    f.run('wall.setThickness', { wallId: left, thickness: 450 });
    expect(values(f, [d as string])).toEqual([1000]);
  });

  it('změna čísla kóty posune otvor; zamčená kóta zabrání posunu otvoru', () => {
    const f = fixture();
    const [left, top] = room(f);
    const [o] = f.run('opening.create', { wallId: top, offset: 1000, width: 900 });
    const [d] = f.run('dimension.create', {
      kind: 'linear',
      viewId: f.viewId,
      refs: [
        { wallId: left, face: 'ref' },
        { wallId: top, face: 'start', openingId: o },
      ],
      ownerRef: 1,
    });
    f.run('dimension.setValue', { dimensionId: d, value: 1250 });
    expect(f.model.openings[o as string]?.offset).toBeCloseTo(1250);
    f.run('dimension.setLocked', { dimensionId: d, locked: true });
    const r = f.editor.execute('opening.move', { openingIds: [o], distance: 100 });
    expect(r.ok).toBe(false);
  });

  it('smazání otvoru smaže kóty k jeho hranám', () => {
    const f = fixture();
    const [left, top] = room(f);
    const [o] = f.run('opening.create', { wallId: top, offset: 1000, width: 900 });
    f.run('dimension.create', {
      kind: 'linear',
      viewId: f.viewId,
      refs: [
        { wallId: left, face: 'ref' },
        { wallId: top, face: 'start', openingId: o },
      ],
    });
    f.run('opening.delete', { openingIds: [o] });
    expect(Object.keys(f.model.dimensions)).toHaveLength(0);
  });

  it('okótování celé stěny: řetěz líc – hrany – líc (vnější líc) a celková délka', () => {
    const f = fixture();
    const [, top] = room(f);
    f.run('opening.create', { wallId: top, offset: 500, width: 1000 });
    f.run('opening.create', { wallId: top, offset: 2500, width: 800 });
    const ids = f.run('dimension.wholeWall', { wallId: top, viewId: f.viewId });
    expect(ids).toHaveLength(6);
    // Vnější líc horní stěny je delší o dvě tloušťky (300 + 300): 4600 = 800 + 1000 + 1000 + 800 + 1000.
    expect(values(f, ids)).toEqual([800, 1000, 1000, 800, 1000, 4600]);
    const groups = new Set(ids.map((id) => f.model.dimensions[id]?.alignGroupId));
    expect(groups.size).toBe(2);
  });

  it('okótování celé stěny na vnitřním líci a u volné stěny (čela konců)', () => {
    const f = fixture();
    const [, top] = room(f);
    f.run('opening.create', { wallId: top, offset: 500, width: 1000 });
    expect(values(f, f.run('dimension.wholeWall', { wallId: top, side: 'ref', viewId: f.viewId }))).toEqual([
      500, 1000, 2500, 4000,
    ]);
    const w = f.line(vec(0, 8000), vec(5000, 8000));
    expect(values(f, f.run('dimension.wholeWall', { wallId: w, viewId: f.viewId }))).toEqual([5000]);
  });

  it('dočasné kóty otvoru: k sousednímu otvoru a k líci, který stěnu ohraničuje', () => {
    const f = fixture();
    const [, top] = room(f);
    const [a] = f.run('opening.create', { wallId: top, offset: 500, width: 1000 });
    f.run('opening.create', { wallId: top, offset: 2500, width: 800 });
    const t = openingTempDimensions(f.model, a as string, 'ref');
    expect(t.map((x) => Math.round(x.value))).toEqual([500, 1000]);
  });
});
