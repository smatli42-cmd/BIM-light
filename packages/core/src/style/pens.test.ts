import { describe, expect, it } from 'vitest';
import { fixture } from '../testing/fixture.ts';
import { drawView } from '../view/draw-view.ts';
import { defaultPenTable, penWidthMm, scaleColumn, withPenWidth } from './pens.ts';

describe('katalog-pohledy / základ 32: tloušťka čáry je jen číslo pera, tabulka pero × měřítko', () => {
  it('základ 32: výchozí tabulka = řada ISO 128, 7 per, stejná ve všech měřítcích', () => {
    const t = defaultPenTable();
    expect(t.scales).toEqual([20, 50, 100, 200, 500]);
    expect(t.pens.map((p) => p.widths[0])).toEqual([0.13, 0.18, 0.25, 0.35, 0.5, 0.7, 1.0]);
    for (const scale of t.scales) expect(penWidthMm(t, 5, scale)).toBe(0.5);
  });

  it('základ 32: stejné pero v jiném měřítku vezme jiný sloupec', () => {
    const t = withPenWidth(defaultPenTable(), 5, 100, 0.35);
    expect(penWidthMm(t, 5, 50)).toBe(0.5);
    expect(penWidthMm(t, 5, 100)).toBe(0.35);
    expect(scaleColumn(t, 60)).toBe(1);
    expect(scaleColumn(t, 75)).toBe(2);
    expect(scaleColumn(t, 1000)).toBe(4);
  });

  it('základ 32: kresba nese jen číslo pera, nikde mm čáry', () => {
    const f = fixture();
    f.line({ x: 0, y: 0 }, { x: 5000, y: 0 });
    for (const p of drawView(f.model, f.viewId).primitives) {
      if (p.kind === 'line') {
        expect(Number.isInteger(p.stroke.pen)).toBe(true);
        expect(Object.keys(p.stroke)).toEqual(['pen', 'color', 'lineType']);
      }
    }
  });

  it('katalog-pohledy / testy: změna hodnoty v tabulce změní všechny čáry s tímto perem', () => {
    const f = fixture();
    f.line({ x: 0, y: 0 }, { x: 5000, y: 0 });
    f.line({ x: 0, y: 2000 }, { x: 5000, y: 2000 });
    f.run('display.setPenWidth', { pen: 6, scale: 100, mm: 0.8 });
    const outlines = drawView(f.model, f.viewId).primitives.filter(
      (p) => p.kind === 'line' && p.source.role === 'obrys',
    );
    expect(outlines).toHaveLength(2);
    for (const o of outlines) {
      if (o.kind === 'line') expect(penWidthMm(f.model.display.penTable, o.stroke.pen, 100)).toBe(0.8);
    }
  });

  it('základ 32: neexistující měřítko v tabulce příkaz odmítne', () => {
    const f = fixture();
    expect(f.editor.execute('display.setPenWidth', { pen: 5, scale: 75, mm: 0.6 }).ok).toBe(false);
  });
});
