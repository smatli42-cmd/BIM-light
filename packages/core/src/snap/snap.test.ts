import { describe, expect, it } from 'vitest';
import { vec } from '../geometry/index.ts';
import { fixture, near, room } from '../testing/fixture.ts';
import { roundTo } from './angle.ts';
import { snapPoint } from './resolve.ts';
import { directionFromRelative, parseNumber, relativeAngleDeg, trackerPoint } from './tracker.ts';

const DEG = Math.PI / 180;

describe('katalog-kresleni / část 2: přichytávání', () => {
  it('2.1: konec stěny má přednost před lícem', () => {
    const f = fixture();
    f.line(vec(0, 0), vec(4000, 0));
    const r = snapPoint(f.model, f.storeyId, vec(3995, 8), { tolerance: 50 });
    expect(r.snap?.kind).toBe('endpoint');
    expect(near(r.point, vec(4000, 0))).toBe(true);
  });

  it('2.1: na líci daleko od konce se přichytí k líci, uprostřed ke středu', () => {
    const f = fixture();
    f.line(vec(0, 0), vec(4000, 0));
    expect(snapPoint(f.model, f.storeyId, vec(1000, 20), { tolerance: 50 }).snap?.kind).toBe('face');
    expect(snapPoint(f.model, f.storeyId, vec(2010, 10), { tolerance: 50 }).snap?.kind).toBe('midpoint');
  });

  it('2.3: kandidáty u rohu střídá klávesa C (pořadí a počet)', () => {
    const f = fixture();
    room(f);
    const a = snapPoint(f.model, f.storeyId, vec(5, 3005), { tolerance: 400 });
    expect(a.snap!.count).toBeGreaterThan(1);
    const b = snapPoint(f.model, f.storeyId, vec(5, 3005), { tolerance: 400, cycle: 1 });
    expect(b.snap!.index).toBe(1);
    expect(near(a.point, b.point)).toBe(false);
  });

  it('2.3: průsečík dvou líců se nabízí', () => {
    const f = fixture();
    f.line(vec(0, 0), vec(4000, 0));
    f.line(vec(2000, -2000), vec(2000, 2000));
    const r = snapPoint(f.model, f.storeyId, vec(2003, 3), { tolerance: 20 });
    expect(r.snap?.kind).toBe('intersection');
  });

  it('2.7: Alt přichytávání vypne', () => {
    const f = fixture();
    f.line(vec(0, 0), vec(4000, 0));
    const r = snapPoint(f.model, f.storeyId, vec(3995, 8), { tolerance: 50, disabled: true });
    expect(r.snap).toBeNull();
    expect(r.point).toEqual(vec(3995, 8));
  });

  it('[R] 2: délka bez přichycení se zaokrouhlí na 10 mm', () => {
    const f = fixture();
    const r = snapPoint(f.model, f.storeyId, vec(1234, 2), { tolerance: 1, from: vec(0, 0) });
    expect(r.point.x).toBeCloseTo(1230, 6);
    expect(roundTo(1236)).toBe(1240);
  });

  it('[R] 2: úhlové kroky 0° / 90° vůči předchozí stěně a 45°', () => {
    const f = fixture();
    const from = vec(0, 0);
    const r45 = snapPoint(f.model, f.storeyId, vec(1003, 1000), { tolerance: 1, from, prevDir: null });
    expect(r45.snap?.kind).toBe('angle');
    expect(r45.point.x).toBeCloseTo(r45.point.y, 6);
    const prev = 30 * DEG;
    const p = { x: Math.cos(prev - Math.PI / 2) * 2000, y: Math.sin(prev - Math.PI / 2) * 2000 + 30 };
    const r90 = snapPoint(f.model, f.storeyId, p, { tolerance: 1, from, prevDir: prev });
    expect(r90.snap?.label).toBe('pravý úhel');
  });

  it('[R] 2: Shift drží jen 0° / 90°', () => {
    const f = fixture();
    const r = snapPoint(f.model, f.storeyId, vec(1000, 700), {
      tolerance: 1,
      from: vec(0, 0),
      orthoOnly: true,
    });
    expect(r.point.y).toBeCloseTo(0, 6);
  });

  it('2.4: pomocná čára vodorovně od rohu stěny', () => {
    const f = fixture();
    f.line(vec(0, 0), vec(0, 3000));
    const r = snapPoint(f.model, f.storeyId, vec(2000, 3006), { tolerance: 20 });
    expect(r.snap?.kind).toBe('guide');
    expect(r.point.y).toBe(3000);
    expect(r.guides.length).toBe(1);
  });
});

describe('katalog-kresleni / část 1: tracker', () => {
  it('[R] úhel vůči předchozí stěně: 180° rovně, 90° doprava, 270° doleva', () => {
    expect(relativeAngleDeg(0, 0)).toBeCloseTo(180);
    expect(relativeAngleDeg(-Math.PI / 2, 0)).toBeCloseTo(90);
    expect(relativeAngleDeg(Math.PI / 2, 0)).toBeCloseTo(270);
    expect(directionFromRelative(90, 0)).toBeCloseTo(-Math.PI / 2);
  });

  it('1: první stěna řetězu má úhel od osy X', () => {
    expect(relativeAngleDeg(Math.PI / 2, null)).toBeCloseTo(90);
  });

  it('1.4 + 2.5: napsané číslo je přesné a má přednost před myší', () => {
    const r = trackerPoint(vec(0, 0), vec(1237, 15), null, { length: '2500', angle: '' });
    expect(r.typed).toBe(true);
    expect(r.point.x).toBeCloseTo(2500 * Math.cos(Math.atan2(15, 1237)), 6);
    const r2 = trackerPoint(vec(0, 0), vec(1237, 15), 0, { length: '1234,5', angle: '90' });
    expect(near(r2.point, vec(0, -1234.5), 1e-6)).toBe(true);
  });

  it('čísla s čárkou i mezerou', () => {
    expect(parseNumber('1 234,5')).toBe(1234.5);
    expect(parseNumber('abc')).toBeNaN();
  });
});
