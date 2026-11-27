import { describe, expect, it } from 'vitest';
import { overshoot, sketchSegments } from './sketch.ts';

describe('3D náhled / režim Skica: kreslené hrany', () => {
  it('úsečka přetáhne přes oba konce o 2 % délky (15–60 mm), odchylka konce do 4 mm', () => {
    const [x0, , , x1] = sketchSegments([0, 0, 0, 3000, 0, 0]);
    expect(x1! - x0!).toBeGreaterThan(3000 + 2 * overshoot(3000) - 10);
    expect(x1! - x0!).toBeLessThan(3000 + 2 * overshoot(3000) + 10);
    expect(overshoot(100)).toBe(15);
    expect(overshoot(10000)).toBe(60);
  });

  it('stejný vstup = stejná kresba (nebliká); nulová úsečka zmizí', () => {
    const segs = [0, 0, 0, 1000, 500, 0, 5, 5, 5, 5, 5, 5];
    expect(sketchSegments(segs)).toEqual(sketchSegments(segs));
    expect(sketchSegments(segs)).toHaveLength(6);
  });
});
