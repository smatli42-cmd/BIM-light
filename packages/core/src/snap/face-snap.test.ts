import { describe, expect, it } from 'vitest';
import { dist, vec } from '../geometry/index.ts';
import { fixture } from '../testing/fixture.ts';
import { snapPoint } from './resolve.ts';

describe('katalog-kresleni / část 2: líc při kreslení stěny', () => {
  it('závada: stěna mezi dvěma stěnami drží kolmý směr i na protějším líci', () => {
    const f = fixture();
    f.line(vec(0, 0), vec(4000, 0));
    f.line(vec(0, 3000), vec(4000, 3000));
    const from = vec(1000, 0);
    const r = snapPoint(f.model, f.storeyId, vec(1080, 3010), { tolerance: 150, from });
    expect(r.snap?.kind).toBe('face');
    expect(r.snap?.label).toContain('líc +');
    expect(r.point.x).toBeCloseTo(1000, 6);
    expect(Math.abs(r.point.y - 3000) <= 300).toBe(true);
  });

  it('závada: s Shift drží pravý úhel i na protějším líci', () => {
    const f = fixture();
    f.line(vec(0, 0), vec(4000, 0));
    f.line(vec(0, 3000), vec(4000, 3000));
    const from = vec(1000, 0);
    const r = snapPoint(f.model, f.storeyId, vec(1300, 3010), { tolerance: 400, from, orthoOnly: true });
    expect(r.point.x).toBeCloseTo(1000, 6);
  });

  it('závada: bod na líci bez předchozího bodu se zaokrouhlí na 10 mm', () => {
    const f = fixture();
    f.line(vec(0, 0), vec(4000, 0));
    const r = snapPoint(f.model, f.storeyId, vec(1234, 3), { tolerance: 50 });
    expect(r.snap?.kind).toBe('face');
    expect(r.point.x).toBeCloseTo(1230, 6);
  });

  it('závada: délka stěny končící na líci (šikmo) se zaokrouhlí na 10 mm', () => {
    const f = fixture();
    f.line(vec(0, 3000), vec(4000, 3000));
    const from = vec(0, 0);
    const r = snapPoint(f.model, f.storeyId, vec(1234, 3005), { tolerance: 50, from });
    expect(r.snap?.kind).toBe('face');
    const l = dist(from, r.point);
    expect(Math.abs(l - Math.round(l / 10) * 10)).toBeLessThan(1e-6);
  });
});
