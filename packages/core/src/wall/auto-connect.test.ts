import { describe, expect, it } from 'vitest';
import { fixture } from '../testing/fixture.ts';
import { connectionsOf, sidesFor } from './queries.ts';

/** Místnost obdélníkem 4000 × 3000 (vnitřní líc, tloušťka 300 ven): stěny horní, pravá, spodní, levá. */
function block() {
  const f = fixture();
  const ids = f.run('wall.rectangle', {
    storeyId: f.storeyId,
    typeId: f.type('Zdivo 300'),
    a: { x: 0, y: 0 },
    b: { x: 4000, y: 3000 },
  }) as string[];
  return { f, top: ids[0]!, left: ids[3]! };
}

const hostOf = (f: ReturnType<typeof fixture>, id: string) =>
  connectionsOf(f.model, id).map((c) => sidesFor(c, id).other);

describe('závada: stěna kreslená k jiné stěně jiné šířky se někdy nenapojí', () => {
  it('stěna z vnějšího rohu podél vnějšího líce se napojí v T na kolmou stěnu, ne na rovnoběžnou', () => {
    const { f, left } = block();
    const id = f.run('wall.create', {
      storeyId: f.storeyId,
      typeId: f.type('Příčka 125'),
      path: { kind: 'line', start: { x: -300, y: 3300 }, end: { x: -2000, y: 3300 } },
      autoConnect: true,
    })[0]!;
    expect(hostOf(f, id)).toEqual([{ wallId: left, at: 'ATPATH' }]);
  });
});

describe('závada: stěny jiné tloušťky za sebou (rovné napojení)', () => {
  it('čelo se kreslí jen tam, kde ho navazující stěna nezakrývá', async () => {
    const { drawView } = await import('../view/draw-view.ts');
    const f = fixture();
    const a = f.line({ x: 0, y: 0 }, { x: 3000, y: 0 });
    const b = f.run('wall.create', {
      storeyId: f.storeyId,
      typeId: f.type('Příčka 125'),
      path: { kind: 'line', start: { x: 3000, y: 0 }, end: { x: 6000, y: 0 } },
      autoConnect: true,
    })[0]!;
    expect(hostOf(f, b)).toEqual([{ wallId: a, at: 'ATEND' }]);
    const lines = drawView(f.model, f.viewId).primitives.filter((p) => p.kind === 'line');
    const onX3000 = lines.flatMap((l) =>
      l.kind === 'line'
        ? l.points.flatMap((p, i) => {
            const q = l.points[i + 1] ?? (l.closed ? l.points[0] : undefined);
            return q && Math.abs(p.x - 3000) < 1e-6 && Math.abs(q.x - 3000) < 1e-6
              ? [[p.y, q.y].sort((m, n) => m - n)]
              : [];
          })
        : [],
    );
    expect(onX3000).toEqual([[125, 300]]);
  });

  it('rozdělená stěna nemá v místě dělení čáru', async () => {
    const { drawView } = await import('../view/draw-view.ts');
    const f = fixture();
    const a = f.line({ x: 0, y: 0 }, { x: 6000, y: 0 });
    f.run('wall.split', { wallId: a, point: { x: 3000, y: 0 } });
    const vertical = drawView(f.model, f.viewId).primitives.some(
      (l) =>
        l.kind === 'line' &&
        l.points.some((p, i) => {
          const q = l.points[i + 1];
          return !!q && Math.abs(p.x - 3000) < 1e-6 && Math.abs(q.x - 3000) < 1e-6;
        }),
    );
    expect(vertical).toBe(false);
  });
});
