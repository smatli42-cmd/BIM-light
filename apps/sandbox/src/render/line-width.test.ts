import { describe, expect, it } from 'vitest';
import { screenLineWidth, snapToPixel } from './line-width.ts';

const devicePx = (cssPx: number, dpr: number) => cssPx * dpr;

describe('oprava 2026-11-26: šrafy na obrazovce stejně silné (celé pixely obrazovky)', () => {
  it('základ 32: tenké pero (pod 1 pixel) se nezmenší pod 1 pixel obrazovky – jinak čáry blednou nestejně', () => {
    // pero 0,13 mm × 3,78 px/mm = 0,49 px: dříve 0,5 px a vyhlazování dávalo každé čáře jinou sytost
    for (const dpr of [1, 1.25, 1.5, 2]) expect(devicePx(screenLineWidth(0.13, false, dpr), dpr)).toBe(1);
  });

  it('základ 32: skutečná tloušťka se zaokrouhlí na celé pixely obrazovky (ostrá čára, ne rozmazaná)', () => {
    for (const dpr of [1, 1.25, 2])
      for (const mm of [0.18, 0.25, 0.35, 0.5, 0.7]) {
        const px = devicePx(screenLineWidth(mm, false, dpr), dpr);
        expect(Number.isInteger(Math.round(px * 1e9) / 1e9)).toBe(true);
        expect(px).toBeGreaterThanOrEqual(1);
      }
  });

  it('koncepce rozhraní 2 G: vlasové čáry = přesně 1 pixel obrazovky pro každé pero', () => {
    for (const dpr of [1, 1.25, 2]) expect(devicePx(screenLineWidth(0.7, true, dpr), dpr)).toBe(1);
  });

  it('silnější pero nikdy není tenčí než slabší (řez zůstane silnější než šrafa)', () => {
    const w = [0.13, 0.18, 0.25, 0.35, 0.5, 0.7, 1].map((mm) => screenLineWidth(mm, false, 1.25));
    for (let i = 1; i < w.length; i++) expect(w[i]).toBeGreaterThanOrEqual(w[i - 1]!);
  });

  it('vodorovná a svislá šrafa leží ve středu pixelu obrazovky (1px čára nezabere dva poloviční)', () => {
    expect(snapToPixel(10.3, 1)).toBe(10.5);
    expect(snapToPixel(10.9, 2)).toBe(10.75);
    expect(snapToPixel(-3.2, 1)).toBe(-3.5);
  });
});
