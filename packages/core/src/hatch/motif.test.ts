import { describe, expect, it } from 'vitest';
import { drawView } from '../view/draw-view.ts';
import { fixture } from '../testing/fixture.ts';
import { parseProject, serializeProject } from '../persistence/project-file.ts';
import { curvePoints, motifStrokes } from './motif.ts';
import { HATCH_LIBRARY, validateHatches } from './registry.ts';
import { scaleHatch } from './scale.ts';
import { entry, motif, polyline, smooth, type MotifFamily } from './types.ts';

const RANGE = { u0: 0, u1: 20, v0: 0, v1: 20 };
const lib = (id: string) => HATCH_LIBRARY.find((h) => h.id === id)!;

describe('katalog-sraf-materialu / šrafy podle ČSN 01 3420: rodina motiv', () => {
  it('motiv se vykreslí: křivky se opakují v rastru přes celou plochu', () => {
    const f = motif([polyline([-1, 0], [1, 0])], 4, 5);
    const strokes = motifStrokes(f, RANGE);
    expect(strokes.length).toBeGreaterThanOrEqual(5 * 4);
    const xs = strokes.flat().map((p) => p.x);
    expect(Math.min(...xs)).toBeLessThanOrEqual(0);
    expect(Math.max(...xs)).toBeGreaterThanOrEqual(20);
  });

  it('posun každé druhé řady se projeví jen v lichých řadách', () => {
    const f = motif([polyline([0, 0], [0.1, 0])], 4, 5, 2);
    const starts = motifStrokes(f, RANGE).map((s) => s[0]!);
    const row = (y: number) => starts.filter((p) => p.y === y).map((p) => p.x % 4);
    expect(new Set(row(0).map((x) => Math.abs(x)))).toEqual(new Set([0]));
    expect(new Set(row(5).map((x) => Math.abs(x)))).toEqual(new Set([2]));
  });

  it('vyhlazená uzavřená křivka je hustě navzorkovaná, prochází body a vrací se na začátek', () => {
    const c = smooth(true, [0, 2], [1, 0], [0, -2], [-1, 0]);
    const pts = curvePoints(c);
    expect(pts.length).toBeGreaterThan(20);
    expect(pts[0]).toEqual({ x: 0, y: 2 });
    expect(pts[pts.length - 1]).toEqual(pts[0]);
    expect(pts.some((p) => Math.abs(p.x - 1) < 1e-9 && Math.abs(p.y) < 1e-9)).toBe(true);
  });

  it('obrovský rozsah se nekreslí (ochrana proti zamrznutí)', () => {
    const f = motif([polyline([0, 0], [1, 0])], 0.1, 0.1);
    expect(motifStrokes(f, { u0: 0, u1: 1000, v0: 0, v1: 1000 })).toEqual([]);
  });

  it('neplatný motiv knihovna odmítne (bez křivek, křivka s jedním bodem, nulová rozteč)', () => {
    const h = entry('ostatni');
    const bad = [
      h(1, 'hatch.a', 'A', { families: [motif([], 2, 2)] }),
      h(2, 'hatch.b', 'B', { families: [motif([polyline([0, 0])], 2, 2)] }),
      h(3, 'hatch.c', 'C', { families: [motif([polyline([0, 0], [1, 1])], 0, 2)] }),
    ];
    expect(validateHatches(bad)).toHaveLength(3);
  });
});

describe('katalog-sraf-materialu: měřítko šraf ve stylu', () => {
  it('měřítko šraf mění rozměr, ne tvar: motiv ×2 = body ×2', () => {
    const h = lib('hatch.tepelna-izolace');
    const f = h.families[0] as MotifFamily;
    const g = scaleHatch(h, 2).families[0] as MotifFamily;
    const a = motifStrokes(f, RANGE);
    const b = motifStrokes(g, { u0: 0, u1: 40, v0: 0, v1: 40 });
    expect(b.length).toBe(a.length);
    expect(b[3]!.map((p) => ({ x: p.x / 2, y: p.y / 2 }))).toEqual(
      a[3]!.map((p) => ({ x: expect.closeTo(p.x, 9), y: expect.closeTo(p.y, 9) })),
    );
  });

  it('měřítko násobí rozteče čar, čárkování, značky i vlny; úhly zůstanou', () => {
    for (const h of HATCH_LIBRARY) {
      const s = JSON.stringify(scaleHatch(h, 1.5).families.map((f) => f.angle));
      expect(s).toBe(JSON.stringify(h.families.map((f) => f.angle)));
    }
    const beton = scaleHatch(lib('hatch.beton-vyztuzeny'), 2);
    expect(beton.families[1]).toMatchObject({ spacing: 9.6, shift: 4.8, dash: [6.4, 1.6, 0.6, 1.6] });
    expect(scaleHatch(lib('hatch.omitky'), 2).families[0]).toMatchObject({ size: 0.6, dx: 4.4 });
  });

  it('nový styl má měřítko šraf 1; příkaz ho změní jen v rozsahu 0,5–3 a kresba šrafy se zvětší', () => {
    const f = fixture();
    const styleId = f.style('Projekt');
    f.run('view.setStyle', { viewId: f.viewId, styleId });
    f.line({ x: 0, y: 0 }, { x: 5000, y: 0 });
    const spacing = () => {
      const p = drawView(f.model, f.viewId).primitives.find((x) => x.kind === 'hatch');
      return p?.kind === 'hatch' && p.hatch.families[0]?.kind === 'lines' ? p.hatch.families[0].spacing : 0;
    };
    expect(f.model.display.styles[styleId]?.hatchScale).toBe(1);
    const before = spacing();
    f.run('style.setHatchScale', { styleId, hatchScale: 2 });
    expect(spacing()).toBeCloseTo(before * 2);
    expect(f.editor.execute('style.setHatchScale', { styleId, hatchScale: 3.5 }).ok).toBe(false);
    expect(f.editor.execute('style.setHatchScale', { styleId, hatchScale: 0.4 }).ok).toBe(false);
  });
});

describe('katalog-sraf-materialu: příznak základní / odvozená a migrace', () => {
  it('všech 40 šraf projde validací; odvozené jsou ty z katalogu (13)', () => {
    expect(validateHatches(HATCH_LIBRARY)).toEqual([]);
    expect(HATCH_LIBRARY.filter((h) => h.derived).map((h) => h.order)).toEqual([
      5, 6, 7, 11, 12, 13, 16, 18, 22, 23, 27, 28, 29,
    ]);
  });

  it('základ 9: projekt verze 5 dostane měřítko šraf 1 a příznak u kopií šraf', () => {
    const f = fixture();
    const data = JSON.parse(serializeProject(f.model)) as { display: Record<string, unknown> };
    const strip = (rec: unknown, key: string) =>
      Object.fromEntries(
        Object.entries(rec as Record<string, Record<string, unknown>>).map(([id, v]) => {
          const { [key]: _x, ...rest } = v;
          return [id, rest];
        }),
      );
    const display = {
      ...data.display,
      schemaVersion: 2,
      styles: strip(data.display['styles'], 'hatchScale'),
      hatches: strip(data.display['hatches'], 'derived'),
    };
    const r = parseProject(JSON.stringify({ ...data, display, schemaVersion: 5 }));
    if (!r.ok) throw new Error(r.error);
    expect(Object.values(r.model.display.styles).every((s) => s.hatchScale === 1)).toBe(true);
    expect(r.model.display.hatches['hatch.zdivo']?.derived).toBe(false);
    expect(r.model.display.schemaVersion).toBe(3);
  });
});
