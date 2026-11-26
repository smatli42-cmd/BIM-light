import { describe, expect, it } from 'vitest';
import { placeNear } from './keep-inside.ts';

describe('koncepce-rozhrani / 2 I: plovoucí prvek u kurzoru zůstane v okně', () => {
  it('vpravo dole od kurzoru; u pravého a dolního okraje se překlopí', () => {
    const size = { x: 200, y: 100 };
    const room = { x: 800, y: 600 };
    expect(placeNear({ x: 100, y: 100 }, { x: 18, y: 18 }, size, room)).toEqual({ x: 118, y: 118 });
    expect(placeNear({ x: 700, y: 550 }, { x: 18, y: 18 }, size, room)).toEqual({ x: 482, y: 432 });
  });
});
