import { describe, expect, it } from 'vitest';
import { vec } from '../geometry/index.ts';
import { fixture, near } from '../testing/fixture.ts';
import { snapPoint } from './resolve.ts';
import { rectTrackerPoint, rotatedWidthPoint } from './rect-tracker.ts';

function scene() {
  const f = fixture();
  const typeId = Object.values(f.model.slabTypes).find((t) => t.name === 'ŽB strop 250')!.id;
  const [slab] = f.run('slab.create', {
    storeyId: f.storeyId,
    typeId,
    rect: { a: vec(0, 0), b: vec(6000, 4000) },
  });
  const [hole] = f.run('slabOpening.create', {
    storeyId: f.storeyId,
    rect: { a: vec(1000, 1000), b: vec(2000, 2000) },
  });
  return { f, slab: slab!, hole: hole! };
}

describe('katalog-kresleni / část 2 / základ 20: přichytávání k deskám a otvorům v deskách', () => {
  it('2.1: roh desky a roh otvoru v desce', () => {
    const { f, slab, hole } = scene();
    const a = snapPoint(f.model, f.storeyId, vec(5990, 3990), { tolerance: 50 });
    expect([a.snap?.kind, a.snap?.label, a.snap?.ownerId]).toEqual(['endpoint', 'roh', slab]);
    const b = snapPoint(f.model, f.storeyId, vec(2010, 1990), { tolerance: 50 });
    expect([b.snap?.ownerId, b.point]).toEqual([hole, vec(2000, 2000)]);
  });

  it('2.1: hrana desky (zaokrouhleno na 10 mm) a střed hrany', () => {
    const { f } = scene();
    const a = snapPoint(f.model, f.storeyId, vec(4123, 20), { tolerance: 50 });
    expect([a.snap?.label, a.point]).toEqual(['hrana', vec(4120, 0)]);
    expect(snapPoint(f.model, f.storeyId, vec(3010, 4010), { tolerance: 50 }).snap?.label).toBe(
      'střed hrany',
    );
  });

  it('2.1: průsečík hrany desky s lícem stěny', () => {
    const { f } = scene();
    f.line(vec(3000, -1000), vec(3000, 5000));
    const r = snapPoint(f.model, f.storeyId, vec(3010, 10), { tolerance: 50 });
    expect(r.snap?.kind).toBe('intersection');
  });

  it('2.4: pomocné čáry z rohů desky a otvoru; jejich průsečík', () => {
    const { f } = scene();
    const r = snapPoint(f.model, f.storeyId, vec(2008, 3007), { tolerance: 20 });
    expect(r.snap?.kind).toBe('guide');
    expect(near(r.point, vec(2000, 3010))).toBe(true);
    const x = snapPoint(f.model, f.storeyId, vec(1006, 4500), {
      tolerance: 20,
      guidePoints: [vec(3000, 4500)],
    });
    expect(x.point).toEqual(vec(1000, 4500));
    expect(x.guides.length).toBe(2);
  });

  it('2.7: Alt (disabled) vypne i obrysy desek', () => {
    const { f } = scene();
    expect(
      snapPoint(f.model, f.storeyId, vec(5990, 3990), { tolerance: 50, disabled: true }).snap,
    ).toBeNull();
  });
});

describe('desky D2 / katalog kreslení 1.4: tracker obdélníku', () => {
  it('šířka a hloubka napsané, znaménko podle strany kurzoru', () => {
    const a = vec(1000, 1000);
    expect(rectTrackerPoint(a, vec(0, 3000), { width: '600', depth: '' }).point).toEqual(vec(400, 3000));
    const r = rectTrackerPoint(a, vec(1500, 500), { width: '1200', depth: '800' });
    expect([r.point, r.width, r.depth, r.typed]).toEqual([vec(2200, 200), 1200, 800, true]);
    expect(rectTrackerPoint(a, vec(1500, 500), { width: '', depth: '' }).typed).toBe(false);
  });

  it('natočený obdélník: šířka kolmo k první hraně na stranu kurzoru', () => {
    const r = rotatedWidthPoint(vec(0, 0), vec(1000, 0), vec(500, -300), '750');
    expect([r.point, r.width]).toEqual([vec(1000, -750), 750]);
    expect(rotatedWidthPoint(vec(0, 0), vec(1000, 0), vec(500, 300), '').width).toBe(300);
  });
});
