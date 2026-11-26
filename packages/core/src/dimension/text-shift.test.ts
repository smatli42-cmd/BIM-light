import { describe, expect, it } from 'vitest';
import { dist, vec } from '../geometry/index.ts';
import { fixture } from '../testing/fixture.ts';
import { layoutDimension } from './layout.ts';

function shortDim() {
  const f = fixture();
  const a = f.line(vec(0, 0), vec(0, 3000), { typeId: f.type('Příčka 100') });
  const b = f.line(vec(200, 0), vec(200, 3000), { typeId: f.type('Příčka 100') });
  const [d] = f.run('dimension.createSet', {
    viewId: f.viewId,
    items: [
      {
        kind: 'linear',
        refs: [
          { wallId: a, face: 'ref' },
          { wallId: b, face: 'ref' },
        ],
      },
    ],
    point: vec(100, 3600),
  });
  const lay = () =>
    layoutDimension(
      f.model,
      f.model.dimensions[d!]!,
      f.model.views[f.viewId]!.scale,
      f.model.display.paperSizes,
    )!;
  return { f, d: d!, lay };
}

describe('pokyn uživatele 2026-11-27: číslo kóty jde posunout po kótovací čáře', () => {
  it('posun čísla mimo krátkou kótu: číslo se posune a kótovací čára se pod ně prodlouží', () => {
    const { f, d, lay } = shortDim();
    const before = lay();
    f.run('dimension.setTextShift', { dimensionIds: [d], shift: 800 });
    const after = lay();
    expect(dist(before.textAt, after.textAt)).toBeCloseTo(800);
    expect(after.line.length).toBe(3);
    expect(after.ticks).toEqual(before.ticks);
  });

  it('posun 0 vrátí číslo doprostřed (pole zmizí)', () => {
    const { f, d } = shortDim();
    f.run('dimension.setTextShift', { dimensionIds: [d], shift: 800 });
    f.run('dimension.setTextShift', { dimensionIds: [d], shift: 0 });
    expect(f.model.dimensions[d]!.textShift).toBeUndefined();
  });
});
