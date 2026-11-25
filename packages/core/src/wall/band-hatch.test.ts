// Kresba tepelné izolace ve stěně: šrafa přes celou šířku vrstvy podél osy stěny.
import { describe, expect, it } from 'vitest';
import type { Primitive } from '../drawing/primitives.ts';
import { fixture } from '../testing/fixture.ts';
import { drawView } from '../view/draw-view.ts';

type HatchP = Extract<Primitive, { kind: 'hatch' }>;

function insulation() {
  const f = fixture();
  f.run('view.setStyle', { viewId: f.viewId, styleId: f.style('Projekt') });
  f.line(
    { x: 0, y: 0 },
    { x: 6000, y: 0 },
    { typeId: f.type('Obvodová zateplená 465'), referenceLine: 'face' },
  );
  const hatches = drawView(f.model, f.viewId).primitives.filter((p): p is HatchP => p.kind === 'hatch');
  return hatches.find((h) => h.hatch.id === 'hatch.tepelna-izolace')!;
}

describe('katalog-sraf-materialu: tepelná izolace ve stěně', () => {
  it('šrafa izolace nese křivky v souřadnicích modelu přes celou šířku vrstvy (315–465 mm)', () => {
    const h = insulation();
    expect(h.curves?.length).toBeGreaterThan(0);
    const ys = h.curves!.flat().map((p) => p.y);
    expect(Math.min(...ys)).toBeCloseTo(315, 0);
    expect(Math.max(...ys)).toBeCloseTo(465, 0);
  });

  it('smyčka je 0,65 × tloušťka vrstvy podél stěny a pokryje celou délku', () => {
    const xs = insulation()
      .curves!.flat()
      .map((p) => p.x);
    expect(Math.min(...xs)).toBeLessThan(0);
    expect(Math.max(...xs)).toBeGreaterThan(6000);
  });
});
