import { describe, expect, it } from 'vitest';
import { rect, type PlanePolygon } from './polygon.ts';
import { narrowLimit, tileLayout } from './tiling.ts';
import type { TileFormat } from './types.ts';

const area = (u: number, v: number, holes: PlanePolygon['holes'] = []): PlanePolygon[] => [
  { outer: rect(0, 0, u, v), holes },
];
const tile = (w: number, h: number, joint: number, align: TileFormat['align']): TileFormat => ({
  width: w,
  height: h,
  joint,
  jointColor: '#888888',
  align,
});
const widths = (l: ReturnType<typeof tileLayout>, row = 0) =>
  l.pieces
    .filter((p) => p.row === row)
    .sort((a, b) => a.col - b.col)
    .map((p) => Math.round(p.width));

describe('prvky stavby 9: spárořez – mřížka formátu a spáry ořezaná na plochu', () => {
  it('prvky stavby 9: od rohu – celé kusy od levého dolního rohu, odřezy na konci řady', () => {
    const l = tileLayout(area(2000, 1000), tile(300, 300, 0, 'corner'), { x: 0, y: 0 });
    expect(l.whole).toBe(18);
    expect(l.cut).toBe(10);
    expect(widths(l)).toEqual([300, 300, 300, 300, 300, 300, 200]);
  });

  it('prvky stavby 9: na střed – dlaždice ve středu plochy, stejné odřezy po stranách', () => {
    const l = tileLayout(area(1200, 600), tile(600, 600, 0, 'center'), { x: 0, y: 0 });
    expect(widths(l)).toEqual([300, 600, 300]);
  });

  it('prvky stavby 9: na osu – spára ve středu plochy v obou směrech', () => {
    const l = tileLayout(area(1210, 600), tile(600, 600, 10, 'axis'), { x: 0, y: 0 });
    expect(widths(l)).toEqual([600, 600]);
    expect(l.joints.map((j) => [j.a.x, j.a.y, j.b.x, j.b.y])).toEqual([
      [605, 0, 605, 600],
      [0, 300, 1210, 300],
    ]);
  });

  it('prvky stavby 9: spáry jako osy spár, jen uvnitř plochy', () => {
    const l = tileLayout(area(1200, 600), tile(600, 600, 4, 'corner'), { x: 0, y: 0 });
    expect(l.joints).toEqual([{ a: { x: 602, y: 0 }, b: { x: 602, y: 600 } }]);
  });

  it('prvky stavby 9: spáry se přeruší v otvoru, kusy kolem otvoru jsou odřezy', () => {
    const hole = rect(500, 0, 700, 500).reverse();
    const l = tileLayout(area(1200, 1200, [hole]), tile(300, 300, 0, 'corner'), { x: 0, y: 0 });
    const v600 = l.joints.filter((j) => Math.abs(j.a.x - 600) < 1e-6);
    expect(v600).toEqual([{ a: { x: 600, y: 500 }, b: { x: 600, y: 1200 } }]);
    expect(l.whole + l.cut).toBe(16);
    expect(l.cut).toBe(4);
  });

  it('prvky stavby 9: upozornění na příliš úzký řez (pod třetinu formátu, aspoň 50 mm)', () => {
    expect(narrowLimit(600)).toBe(200);
    expect(narrowLimit(80)).toBe(40);
    const l = tileLayout(area(1250, 600), tile(600, 600, 0, 'corner'), { x: 0, y: 0 });
    expect(l.narrow).toBe(1);
    expect(l.pieces.find((p) => p.narrow)?.width).toBeCloseTo(50);
  });

  it('prvky stavby 9: posun počátku tažením – řezy se hned přepočítají', () => {
    const t = tile(600, 600, 0, 'corner');
    const moved = tileLayout(area(1250, 600), t, { x: 25, y: 0 });
    expect(moved.origin).toEqual({ x: 25, y: 0 });
    expect(widths(moved)).toEqual([25, 600, 600, 25]);
    expect(moved.narrow).toBe(2);
    expect(widths(tileLayout(area(1250, 600), t, { x: 325, y: 0 }))).toEqual([325, 600, 325]);
  });
});
