import { describe, expect, it } from 'vitest';
import { overshoot, sketchSegments } from './sketch.ts';

describe('3D náhled / režim Skica: kreslené hrany', () => {
  it('úsečka přetáhne přes oba konce o 4 % délky (40–150 mm), odchylka konce do 12 mm', () => {
    const [x0, , , x1] = sketchSegments([0, 0, 0, 3000, 0, 0]);
    expect(x1! - x0!).toBeGreaterThan(3000 + 2 * overshoot(3000) - 25);
    expect(x1! - x0!).toBeLessThan(3000 + 2 * overshoot(3000) + 25);
    expect(overshoot(100)).toBe(40);
    expect(overshoot(10000)).toBe(150);
  });

  it('stejný vstup = stejná kresba (nebliká); nulová úsečka zmizí', () => {
    const segs = [0, 0, 0, 1000, 500, 0, 5, 5, 5, 5, 5, 5];
    expect(sketchSegments(segs)).toEqual(sketchSegments(segs));
    expect(sketchSegments(segs)).toHaveLength(6);
  });
});
