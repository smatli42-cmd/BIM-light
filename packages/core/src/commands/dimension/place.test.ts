import { describe, expect, it } from 'vitest';
import { vec } from '../../geometry/index.ts';
import { dimensionLine } from '../../dimension/align.ts';
import { measureDimension } from '../../dimension/measure.ts';
import { fixture, room } from '../../testing/fixture.ts';

function threeWalls() {
  const f = fixture();
  const a = f.line(vec(0, 0), vec(0, 3000));
  const b = f.line(vec(1000, 0), vec(1000, 3000));
  const c = f.line(vec(4000, 0), vec(4000, 3000));
  return { f, a, b, c };
}

const chain = (f: ReturnType<typeof fixture>, a: string, b: string, c: string) =>
  f.run('dimension.createSet', {
    viewId: f.viewId,
    items: [
      {
        kind: 'linear',
        refs: [
          { wallId: a, face: 'ref' },
          { wallId: b, face: 'ref' },
        ],
        ownerRef: 1,
      },
      {
        kind: 'linear',
        refs: [
          { wallId: b, face: 'ref' },
          { wallId: c, face: 'ref' },
        ],
        ownerRef: 1,
      },
    ],
    point: vec(500, 3500),
  });

describe('pravidla-interakce / kóty 2–4, 7: řada kót a usazení', () => {
  it('kóty 7: řada vznikne najednou, leží na jedné čáře a tvoří skupinu zarovnání', () => {
    const { f, a, b, c } = threeWalls();
    const ids = chain(f, a, b, c);
    expect(ids.length).toBe(2);
    const [d1, d2] = ids.map((id) => f.model.dimensions[id]!);
    expect(d1!.alignGroupId).not.toBeNull();
    expect(d1!.alignGroupId).toBe(d2!.alignGroupId);
    expect(dimensionLine(f.model, d1!)!.start.y).toBeCloseTo(3500, 6);
    expect(dimensionLine(f.model, d2!)!.start.y).toBeCloseTo(3500, 6);
    expect(f.editor.history.at(-1)).toBe('Řada kót');
  });

  it('kóty 3: alignWith zarovná novou řadu s dřívější (společná skupina)', () => {
    const { f, a, b, c } = threeWalls();
    const [first] = chain(f, a, b, c);
    const [n] = f.run('dimension.createSet', {
      viewId: f.viewId,
      items: [
        {
          kind: 'linear',
          refs: [
            { wallId: a, face: 'ref' },
            { wallId: c, face: 'ref' },
          ],
        },
      ],
      point: vec(0, 3500),
      alignWith: first,
    });
    expect(f.model.dimensions[n!]!.alignGroupId).toBe(f.model.dimensions[first!]!.alignGroupId);
  });

  it('kóty 4: skupina se posune spolu; Alt (detach) kótu ze skupiny vyjme', () => {
    const { f, a, b, c } = threeWalls();
    const ids = chain(f, a, b, c);
    f.run('dimension.place', { dimensionIds: ids, point: vec(0, 4000) });
    for (const id of ids)
      expect(dimensionLine(f.model, f.model.dimensions[id]!)!.start.y).toBeCloseTo(4000, 6);
    f.run('dimension.place', { dimensionIds: [ids[0]], point: vec(0, 4500), detach: true });
    expect(f.model.dimensions[ids[0]!]!.alignGroupId).toBeNull();
    expect(dimensionLine(f.model, f.model.dimensions[ids[1]!]!)!.start.y).toBeCloseTo(4000, 6);
  });

  it('kóty 11: druhá sada na stejném prvku se neodmítne', () => {
    const { f, a, b, c } = threeWalls();
    chain(f, a, b, c);
    chain(f, a, b, c);
    expect(Object.keys(f.model.dimensions).length).toBe(4);
  });

  it('kóty 8: Rozdělit rovnoměrně posune mezilehlé stěny, krajní stojí', () => {
    const { f, a, b, c } = threeWalls();
    const ids = chain(f, a, b, c);
    f.run('dimension.equalize', { dimensionId: ids[0] });
    const [v1, v2] = ids.map((id) => measureDimension(f.model, f.model.dimensions[id]!));
    expect(v1).toBeCloseTo(2000, 6);
    expect(v2).toBeCloseTo(2000, 6);
    expect(f.wall(c).path.start.x).toBeCloseTo(4000, 6);
  });

  it('Přepnout stranu kóty: kótovací čára přejde na druhou stranu', () => {
    const f = fixture();
    const [, top] = room(f);
    const [d] = f.run('dimension.create', {
      kind: 'length',
      ref: { wallId: top, face: 'ref' },
      offset: 600,
      viewId: f.viewId,
    });
    f.run('dimension.flipSide', { dimensionIds: [d] });
    expect(f.model.dimensions[d!]).toMatchObject({ offset: -600 });
  });
});
