import { describe, expect, it } from 'vitest';
import { intersect } from './carrier.ts';
import { arcData, offsetPath, pathLength, tangentAt, tessellate, withEnd, type Path } from './path.ts';
import { paramOf, splitPath } from './split.ts';
import { dist, vec } from './vec.ts';

// Půlkruh poloměr 1000 se středem v počátku, z (1000,0) proti směru hodin do (−1000,0).
const half: Path = { kind: 'arc', start: vec(1000, 0), end: vec(-1000, 0), bulge: 1 };

describe('rozhodnutí / základ 23: tvar stěny přímá nebo oblouk', () => {
  it('základ 23: oblouk z bulge má správný střed, poloměr a délku', () => {
    const a = arcData(half as Extract<Path, { kind: 'arc' }>);
    expect(a.center.x).toBeCloseTo(0);
    expect(a.center.y).toBeCloseTo(0);
    expect(a.radius).toBeCloseTo(1000);
    expect(pathLength(half)).toBeCloseTo(Math.PI * 1000);
  });

  it('základ 23: tečna na začátku a konci oblouku', () => {
    expect(tangentAt(half, 'start').y).toBeCloseTo(1);
    expect(tangentAt(half, 'end').y).toBeCloseTo(-1);
  });

  it('základ 23: odsazení doleva u oblouku proti směru hodin zmenší poloměr', () => {
    const inner = offsetPath(half, 200) as Extract<Path, { kind: 'arc' }>;
    expect(arcData(inner).radius).toBeCloseTo(800);
    const line = offsetPath({ kind: 'line', start: vec(0, 0), end: vec(1000, 0) }, 300);
    expect(line.start.y).toBeCloseTo(300);
  });

  it('základ 23: průsečíky přímka–přímka, přímka–kružnice, kružnice–kružnice', () => {
    expect(
      intersect({ kind: 'line', p: vec(0, 0), d: vec(1, 0) }, { kind: 'line', p: vec(5, 5), d: vec(0, 1) }),
    ).toEqual([{ x: 5, y: 0 }]);
    const lc = intersect(
      { kind: 'line', p: vec(-2000, 0), d: vec(1, 0) },
      { kind: 'circle', c: vec(0, 0), r: 1000 },
    );
    expect(lc.map((p) => Math.round(p.x)).sort((a, b) => a - b)).toEqual([-1000, 1000]);
    const cc = intersect(
      { kind: 'circle', c: vec(0, 0), r: 1000 },
      { kind: 'circle', c: vec(1000, 0), r: 1000 },
    );
    expect(cc).toHaveLength(2);
    expect(
      intersect({ kind: 'line', p: vec(0, 0), d: vec(1, 0) }, { kind: 'line', p: vec(0, 5), d: vec(1, 0) }),
    ).toEqual([]);
  });

  it('základ 23: posun konce po kružnici zachová poloměr', () => {
    const moved = withEnd(half, 'end', vec(0, 1000)) as Extract<Path, { kind: 'arc' }>;
    expect(arcData(moved).radius).toBeCloseTo(1000);
    expect(pathLength(moved)).toBeCloseTo((Math.PI / 2) * 1000);
  });

  it('základ 23: rozklad oblouku na body leží na kružnici', () => {
    for (const p of tessellate(half)) expect(dist(p, vec(0, 0))).toBeCloseTo(1000);
  });

  it('katalog-kresleni / část 5.3: rozdělení úsečky i oblouku v bodě', () => {
    const [a, b] = splitPath(half, vec(0, 1000));
    expect(pathLength(a) + pathLength(b)).toBeCloseTo(pathLength(half));
    expect(paramOf(half, vec(0, 1000))).toBeCloseTo(0.5);
    const [l1, l2] = splitPath({ kind: 'line', start: vec(0, 0), end: vec(10, 0) }, vec(4, 0));
    expect(pathLength(l1)).toBeCloseTo(4);
    expect(pathLength(l2)).toBeCloseTo(6);
  });
});
