import { describe, expect, it } from 'vitest';
import { bubbleAt } from './LessonGuide.tsx';

describe('průvodce prostředím: bublina vedle orámované části, vždy celá v okně', () => {
  const view = { w: 1600, h: 900 };
  it('vpravo od úzké části vlevo; vlevo od části u pravého okraje; pod širokou lištou', () => {
    expect(bubbleAt({ x: 0, y: 100, w: 40, h: 600 }, 200, view).x).toBe(52);
    expect(bubbleAt({ x: 1300, y: 100, w: 300, h: 600 }, 200, view).x).toBe(1300 - 12 - 320);
    expect(bubbleAt({ x: 0, y: 0, w: 1600, h: 44 }, 200, view)).toEqual({ x: 8, y: 56 });
  });
});
