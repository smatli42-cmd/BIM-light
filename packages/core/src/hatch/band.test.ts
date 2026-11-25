// Šrafa tepelné izolace přes celou šířku vrstvy (podklad uživatele: detail a Ardit; Revit / Archicad
// „izolace podle tloušťky vrstvy“).
import { describe, expect, it } from 'vitest';
import { libraryHatch } from './registry.ts';
import { scaleHatch } from './scale.ts';
import { band, type BandFamily } from './types.ts';
import { bandCurves, coilCurve } from './band.ts';

const TEPELNA = libraryHatch('hatch.tepelna-izolace')!.families[0] as BandFamily;

describe('katalog-sraf-materialu: tepelná izolace přes celou šířku vrstvy', () => {
  it('tepelná izolace je pás přes šířku vrstvy (rodina band), ne motiv v mm na papíře', () => {
    expect(TEPELNA.kind).toBe('band');
  });

  it('křivka sahá od líce k líci (a od 0 do 1)', () => {
    const pts = coilCurve(TEPELNA, 150, 0, 3000);
    expect(Math.min(...pts.map((p) => p.a))).toBeCloseTo(0, 6);
    expect(Math.max(...pts.map((p) => p.a))).toBeCloseTo(1, 6);
  });

  it('přizpůsobí se šířce: dvojnásobná vrstva = dvojnásobně dlouhá smyčka (stejný tvar)', () => {
    const a = coilCurve(TEPELNA, 100, 0, 2000);
    const b = coilCurve(TEPELNA, 200, 0, 4000);
    expect(b.length).toBe(a.length);
    b.forEach((p, i) => {
      expect(p.s / 2).toBeCloseTo(a[i]!.s, 6);
      expect(p.a).toBeCloseTo(a[i]!.a, 9);
    });
  });

  it('u obou líců očko: křivka se tam vrací zpět (s klesá)', () => {
    const pts = coilCurve(TEPELNA, 100, 0, 1000);
    const back = (near: (a: number) => boolean) =>
      pts.some((p, i) => i > 0 && near(p.a) && p.s < pts[i - 1]!.s);
    expect(back((a) => a < 0.2)).toBe(true);
    expect(back((a) => a > 0.8)).toBe(true);
  });

  it('pokryje celou délku osy i přesah za konci', () => {
    const pts = coilCurve(band(0.65, 0.3), 100, -300, 5000);
    expect(Math.min(...pts.map((p) => p.s))).toBeLessThanOrEqual(-300);
    expect(Math.max(...pts.map((p) => p.s))).toBeGreaterThanOrEqual(5000);
  });

  it('měřítko šraf stylu pás nemění (velikost dává tloušťka vrstvy)', () => {
    const h = libraryHatch('hatch.tepelna-izolace')!;
    expect(scaleHatch(h, 2).families).toEqual(h.families);
  });

  it('základ 23: na oblouku leží křivka mezi oběma líci (soustředné kružnice)', () => {
    const path = { kind: 'arc' as const, start: { x: 5000, y: 0 }, end: { x: -5000, y: 0 }, bulge: 1 };
    const [pts] = bandCurves(TEPELNA, { path, sideA: 300, sideB: 450, extend: 0 });
    const r = pts!.map((p) => Math.hypot(p.x, p.y));
    expect(Math.min(...r)).toBeGreaterThanOrEqual(5000 - 450 - 1e-6);
    expect(Math.max(...r)).toBeLessThanOrEqual(5000 - 300 + 1e-6);
  });
});
