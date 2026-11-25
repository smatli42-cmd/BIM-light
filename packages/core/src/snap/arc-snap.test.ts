import { describe, expect, it } from 'vitest';
import { vec } from '../geometry/index.ts';
import { fixture, near } from '../testing/fixture.ts';
import { snapPoint } from './resolve.ts';

/** Půlkruh po směru hodin kolem (0, 0), poloměr osy 5000 (Zdivo 300 jde ven). */
function half() {
  const f = fixture();
  f.run('wall.create', {
    storeyId: f.storeyId,
    typeId: f.type('Zdivo 300'),
    path: { kind: 'arc', start: vec(-5000, 0), end: vec(5000, 0), bulge: -1 },
  });
  return f;
}

describe('plan-steny / Z5: přichytávání u oblouku', () => {
  it('střed oblouku', () => {
    const f = half();
    const r = snapPoint(f.model, f.storeyId, vec(20, -15), { tolerance: 50 });
    expect(r.snap?.kind).toBe('center');
    expect(near(r.point, vec(0, 0), 1e-6)).toBe(true);
  });

  it('kvadrant: bod oblouku v 90° (mimo střed a konce)', () => {
    const f = fixture();
    const at = (deg: number) =>
      vec(5000 * Math.cos((deg * Math.PI) / 180), 5000 * Math.sin((deg * Math.PI) / 180));
    f.run('wall.create', {
      storeyId: f.storeyId,
      typeId: f.type('Zdivo 300'),
      path: { kind: 'arc', start: at(200), end: at(30), bulge: Math.tan((-170 * Math.PI) / 180 / 4) },
    });
    const q = snapPoint(f.model, f.storeyId, vec(10, 5290), { tolerance: 50 });
    expect(q.snap?.kind).toBe('quadrant');
    expect(near(q.point, vec(0, 5300), 1e-6)).toBe(true);
  });

  it('tečna z výchozího bodu a kolmice na oblouk', () => {
    const f = half();
    const from = vec(10000, 0);
    // Tečna z (10000, 0) ke kružnici r = 5000 se dotkne v úhlu 60°.
    const t = vec(5000 * Math.cos(Math.PI / 3), 5000 * Math.sin(Math.PI / 3));
    const r = snapPoint(f.model, f.storeyId, vec(t.x + 20, t.y + 10), { tolerance: 60, from });
    const kinds = [0, 1, 2, 3].map((c) =>
      snapPoint(f.model, f.storeyId, vec(t.x + 20, t.y + 10), { tolerance: 60, from, cycle: c }),
    );
    const tangent = kinds.find((k) => k.snap?.kind === 'tangent');
    expect(r.snap).not.toBeNull();
    expect(tangent && near(tangent.point, t, 1e-6)).toBe(true);
    const p = snapPoint(f.model, f.storeyId, vec(3550, 3520), { tolerance: 60, from: vec(7000, 7000) });
    const all = [0, 1, 2].map((c) =>
      snapPoint(f.model, f.storeyId, vec(3550, 3520), { tolerance: 60, from: vec(7000, 7000), cycle: c }),
    );
    // Pata kolmice z (7000, 7000) na oblouk r = 5000 leží ve 45°.
    const foot = vec(5000 * Math.SQRT1_2, 5000 * Math.SQRT1_2);
    expect(p.snap).not.toBeNull();
    expect(all.some((k) => near(k.point, foot, 1))).toBe(true);
  });

  it('průsečík přímé stěny s obloukem', () => {
    const f = half();
    f.line(vec(0, 0), vec(0, 8000));
    const r = snapPoint(f.model, f.storeyId, vec(5, 5005), { tolerance: 50 });
    expect(r.snap?.kind).toBe('intersection');
  });
});
