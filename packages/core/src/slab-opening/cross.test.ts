import { describe, expect, it } from 'vitest';
import { vec, type Vec2 } from '../geometry/index.ts';
import { pointInPolygon } from '../selection/pick.ts';
import { slabOpeningCross } from './cross.ts';

/** Každá čára kříže leží uvnitř obrysu (vzorky podél úsečky, kraje na obrysu se počítají jako uvnitř). */
function inside(segs: [Vec2, Vec2][], outline: readonly Vec2[]) {
  return segs.every(([a, b]) =>
    [0.1, 0.25, 0.5, 0.75, 0.9].every((t) =>
      pointInPolygon({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, outline),
    ),
  );
}

const L = [vec(0, 0), vec(3000, 0), vec(3000, 1000), vec(1000, 1000), vec(1000, 2500), vec(0, 2500)];

describe('prvky stavby 15: kříž v otvoru v desce podle českých zvyklostí', () => {
  it('prvky stavby 15: obdélník = dvě úhlopříčky mezi protilehlými rohy', () => {
    const r = [vec(0, 0), vec(2000, 0), vec(2000, 1000), vec(0, 1000)];
    expect(slabOpeningCross(r)).toEqual([
      [vec(0, 0), vec(2000, 1000)],
      [vec(2000, 0), vec(0, 1000)],
    ]);
  });

  it('prvky stavby 15: L dá 2 obdélníky po 2 čarách, žádná čára mimo obrys', () => {
    const c = slabOpeningCross(L);
    expect(c).toHaveLength(4);
    expect(inside(c, L)).toBe(true);
    expect(c).toContainEqual([vec(0, 0), vec(3000, 1000)]);
    expect(c).toContainEqual([vec(0, 1000), vec(1000, 2500)]);
  });

  it('prvky stavby 15: pravoúhlé U dá 3 obdélníky, vše uvnitř', () => {
    const U = [
      vec(0, 0),
      vec(3000, 0),
      vec(3000, 2000),
      vec(2000, 2000),
      vec(2000, 1000),
      vec(1000, 1000),
      vec(1000, 2000),
      vec(0, 2000),
    ];
    const c = slabOpeningCross(U);
    expect(c).toHaveLength(6);
    expect(inside(c, U)).toBe(true);
  });

  it('prvky stavby 15: obecný nekonvexní obrys = úhlopříčky obálky jen uvnitř obrysu', () => {
    const V = [vec(0, 0), vec(4000, 0), vec(4000, 3000), vec(2000, 1000), vec(0, 3000)];
    const c = slabOpeningCross(V);
    expect(c.length).toBeGreaterThan(0);
    expect(inside(c, V)).toBe(true);
  });

  it('prvky stavby 15: konvexní (natočený) obrys beze změny – bod 0 a 1 s protějšími', () => {
    const r = [vec(0, 0), vec(1000, 1000), vec(0, 2000), vec(-1000, 1000)];
    expect(slabOpeningCross(r)).toEqual([
      [r[0], r[2]],
      [r[1], r[3]],
    ]);
  });
});
