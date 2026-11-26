import { describe, expect, it } from 'vitest';
import { vec } from '../geometry/index.ts';
import { fixture, room } from '../testing/fixture.ts';
import { drawView } from '../view/draw-view.ts';
import { openingOutline } from './draw.ts';
import { openingWarnings } from './warnings.ts';

const dashed = (f: ReturnType<typeof fixture>) =>
  drawView(f.model, f.viewId).primitives.filter(
    (p) => p.kind === 'line' && p.source.role === 'otvor mimo řez',
  );

describe('plan-steny / Z4: kresba otvoru podle roviny řezu (rozhodnutí 2, české zvyklosti)', () => {
  it('otvor v řezu stěnu přeruší (bez čárkování), otvor nad rovinou řezu je čárkovaný obrys', () => {
    const f = fixture();
    const w = f.line(vec(0, 0), vec(6000, 0));
    f.run('opening.create', { wallId: w, offset: 500, width: 1000 });
    f.run('opening.create', { wallId: w, offset: 3000, width: 1000, sill: 2000, height: 500 });
    const lines = dashed(f);
    expect(lines).toHaveLength(1);
    expect(lines[0]?.kind === 'line' && lines[0].stroke.lineType).toBe('dashed');
    // Rovina řezu 2450: první otvor (900–2400) je pod ní = čárkovaně, druhý (2000–2500) ji protíná.
    f.run('view.setCutPlane', { viewId: f.viewId, height: 2450 });
    expect(dashed(f).map((p) => p.source.elementId)).toHaveLength(1);
    const outlines = drawView(f.model, f.viewId).primitives.filter((p) => p.source.role === 'obrys');
    expect(outlines.length).toBeGreaterThan(0);
  });

  it('hrubá i střední podrobnost: obrys stěny i vrstvy se v otvoru přeruší', () => {
    const f = fixture();
    const w = f.line(vec(0, 0), vec(6000, 0), { typeId: f.type('Nosná zeď 330') });
    f.run('opening.create', { wallId: w, offset: 2000, width: 1000 });
    for (const style of ['Studie', 'Projekt']) {
      f.run('view.setStyle', { viewId: f.viewId, styleId: f.style(style) });
      const outline = drawView(f.model, f.viewId).primitives.filter((p) => p.source.role === 'obrys');
      expect(outline.length).toBe(2);
    }
  });

  it('otvor těsně u rohu jen upozorní (pilířek pod 100 mm)', () => {
    const f = fixture();
    const [, top] = room(f);
    const [o] = f.run('opening.create', { wallId: top, offset: 50, width: 900 });
    expect(openingWarnings(f.model, f.model.openings[o as string]!)).toEqual([
      'Otvor je těsně u rohu (pilířek 50 mm)',
    ]);
    f.run('opening.move', { openingIds: [o], distance: 500 });
    expect(openingWarnings(f.model, f.model.openings[o as string]!)).toEqual([]);
  });
});

describe('hlášení uživatele 2026-11-26: obrys otvoru v obloukové stěně sleduje oblouk', () => {
  it('body obrysu leží na lících oblouku (ne tětivy čtyřúhelníku)', () => {
    const f = fixture();
    const [w] = f.run('wall.create', {
      storeyId: f.storeyId,
      typeId: f.type('Zdivo 300'),
      path: { kind: 'arc', start: vec(3000, 0), end: vec(-3000, 0), bulge: 1 },
    });
    const [o] = f.run('opening.create', { wallId: w, offset: 3000, width: 2000 });
    const poly = openingOutline(f.model, f.model.openings[o!]!);
    expect(poly.length).toBeGreaterThan(4);
    const radii = poly.map((p) => Math.hypot(p.x, p.y));
    for (const r of radii)
      expect(Math.min(Math.abs(r - 3000), Math.abs(r - 3300), Math.abs(r - 2700))).toBeLessThan(1);
  });
});
