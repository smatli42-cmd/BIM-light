import { describe, expect, it } from 'vitest';
import { cross, sub, vec } from '../geometry/index.ts';
import { fixture } from '../testing/fixture.ts';
import { dimensionLine } from './align.ts';
import { drawView } from '../view/draw-view.ts';
import { measureDimension } from './measure.ts';

function arcWall() {
  const f = fixture();
  const [w] = f.run('wall.create', {
    storeyId: f.storeyId,
    typeId: f.type('Zdivo 300'),
    path: { kind: 'arc', start: vec(5000, 0), end: vec(-5000, 0), bulge: 1 },
  });
  return { f, w: w! };
}

describe('hlášení uživatele 2026-11-26: tloušťka obloukové stěny se kótuje radiálně', () => {
  it('kótovací čára leží na paprsku ze středu v místě, kam se kóta položí', () => {
    const { f, w } = arcWall();
    const at = vec(3536, 3536);
    const [d] = f.run('dimension.createSet', {
      viewId: f.viewId,
      items: [
        {
          kind: 'linear',
          refs: [
            { wallId: w, face: 'ref' },
            { wallId: w, face: 'opp' },
          ],
        },
      ],
      point: at,
    });
    const dim = f.model.dimensions[d!]!;
    expect(measureDimension(f.model, dim)).toBeCloseTo(300);
    const line = dimensionLine(f.model, dim)!;
    expect(Math.abs(cross(sub(line.start, vec(0, 0)), sub(line.end, vec(0, 0))))).toBeLessThan(1);
    expect(Math.abs(cross(sub(line.start, vec(0, 0)), at))).toBeLessThan(1000);
  });
});

describe('hlášení uživatele 2026-11-26: poloměr a průměr oblouku', () => {
  it('poloměr leží na paprsku přes bod položení; průměr měří 2 × poloměr a vede přes střed', () => {
    const { f, w } = arcWall();
    const at = vec(-3000, 4000);
    const [r, d] = ['radius', 'diameter'].map(
      (measure) =>
        f.run('dimension.createSet', {
          viewId: f.viewId,
          items: [{ kind: 'length', ref: { wallId: w, face: 'ref' }, measure }],
          point: at,
        })[0]!,
    );
    const rd = f.model.dimensions[r!]!;
    const dd = f.model.dimensions[d!]!;
    expect(measureDimension(f.model, rd)).toBeCloseTo(5000);
    expect(measureDimension(f.model, dd)).toBeCloseTo(10000);
    const prims = drawView(f.model, f.viewId).primitives;
    const text = (id: string) =>
      prims.flatMap((p) => (p.kind === 'text' && p.source?.dimensionId === id ? [p.text] : []))[0] ?? '';
    expect(text(r!)).toMatch(/^R /);
    expect(text(d!)).toMatch(/^⌀ /);
    const line = prims.find(
      (p) => p.kind === 'line' && p.source?.dimensionId === r && p.source.role === 'kótovací čára',
    );
    const end = line?.kind === 'line' ? line.points.at(-1)! : vec(0, 0);
    expect(Math.abs(cross(end, at))).toBeLessThan(1);
  });

  it('změna čísla průměru změní poloměr stěny', () => {
    const { f, w } = arcWall();
    const [d] = f.run('dimension.createSet', {
      viewId: f.viewId,
      items: [{ kind: 'length', ref: { wallId: w, face: 'ref' }, measure: 'diameter' }],
      point: vec(0, 6000),
    });
    f.run('dimension.setValue', { dimensionId: d, value: 12000 });
    expect(measureDimension(f.model, f.model.dimensions[d!]!)).toBeCloseTo(12000);
  });
});
