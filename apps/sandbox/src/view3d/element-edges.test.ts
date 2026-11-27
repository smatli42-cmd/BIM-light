import { describe, expect, it } from 'vitest';
import type { MultiPolygon } from 'polygon-clipping';
import { boxed, elementEdges, hideInside, mergedBands } from './element-edges.ts';
import type { Slab } from './slice.ts';

const rect = (x0: number, y0: number, x1: number, y1: number): MultiPolygon => [
  [
    [
      [x0, y0],
      [x1, y0],
      [x1, y1],
      [x0, y1],
      [x0, y0],
    ],
  ],
];
const slab = (z0: number, z1: number, shape: MultiPolygon): Slab => ({ z0, z1, shape });
/** Vodorovné úsečky ve výšce z. */
const atZ = (segs: number[], z: number) => {
  let n = 0;
  for (let i = 0; i + 5 < segs.length; i += 6) if (segs[i + 2] === z && segs[i + 5] === z) n++;
  return n;
};

describe('3D náhled / kvalita: hrany prvku jen na obrysu, ne mezi vrstvami', () => {
  it('deska ze tří vrstev nad sebou: hrany jen dole a nahoře, mezi vrstvami žádné', () => {
    const r = rect(0, 0, 6000, 4000);
    const layers = [slab(-250, -200, r), slab(-200, -50, r), slab(-50, 0, r)];
    expect(mergedBands(layers)).toHaveLength(1);
    const e = elementEdges(layers);
    expect(atZ(e, -250)).toBe(4);
    expect(atZ(e, 0)).toBe(4);
    expect(atZ(e, -200) + atZ(e, -50)).toBe(0);
  });

  it('stěna ze dvou vrstev vedle sebe: jeden obrys, ne čára mezi vrstvami', () => {
    const layers = [slab(0, 3000, rect(0, 0, 5000, 300)), slab(0, 3000, rect(0, 300, 5000, 400))];
    expect(atZ(elementEdges(layers), 3000)).toBe(4);
  });

  it('styk desky a stěny: hrana desky uvnitř stěny se skryje, na povrchu stěny zůstane', () => {
    const wall = boxed(slab(-250, 3000, rect(0, 0, 300, 4000)));
    // Hrana desky probíhá stěnou napříč (x 0–1000 ve výšce −100) – část uvnitř stěny zmizí.
    const through = hideInside([-500, 2000, -100, 1000, 2000, -100], [wall]);
    expect(through).toHaveLength(12);
    expect(Math.max(through[0]!, through[3]!)).toBeLessThanOrEqual(0.5);
    // Hrana po líci stěny (x = 300) leží na povrchu – zůstane celá.
    expect(hideInside([300, 0, 0, 300, 4000, 0], [wall])).toEqual([300, 0, 0, 300, 4000, 0]);
  });
});
