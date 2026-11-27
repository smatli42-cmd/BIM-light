import { describe, expect, it } from 'vitest';
import { vec } from '../geometry/index.ts';
import { pickOpeningEdge } from '../selection/pick-opening.ts';
import { fixture } from '../testing/fixture.ts';
import { drawView } from '../view/draw-view.ts';
import { dimensionPair } from './pair.ts';

const view = (f: ReturnType<typeof fixture>) => f.model.views[f.viewId]!;

describe('hlášení uživatele 2026-11-26: kótování hran bouraného otvoru a niky', () => {
  it('hrana bouraného otvoru i niky jde chytit; skrytý otvor (filtr rekonstrukce) ne', () => {
    const f = fixture();
    const w = f.line(vec(0, 0), vec(6000, 0));
    f.run('wall.setProperties', { wallIds: [w], status: 'existing' });
    const [old] = f.run('opening.create', { wallId: w, offset: 1000, width: 900, status: 'demolished' });
    const [niche] = f.run('opening.create', {
      wallId: w,
      offset: 4000,
      width: 600,
      kind: 'niche',
      depth: 100,
    });
    const hit = pickOpeningEdge(f.model, view(f), vec(1000, 150), 20);
    expect(hit).toMatchObject({ openingId: old, face: 'start', wallId: w });
    expect(pickOpeningEdge(f.model, view(f), vec(4600, 50), 20)).toMatchObject({
      openingId: niche,
      face: 'end',
    });
    const phase = Object.values(f.model.display.overrideCombinations).find(
      (c) => c.name === 'Fáze – plánovaný stav',
    )!;
    f.run('view.setPhaseFilter', { viewId: f.viewId, filterId: phase.id });
    expect(pickOpeningEdge(f.model, view(f), vec(1000, 150), 20)).toBeNull();
  });

  it('kóta mezi hranami bouraného otvoru se vloží a změří šířku', () => {
    const f = fixture();
    const w = f.line(vec(0, 0), vec(6000, 0));
    const [o] = f.run('opening.create', { wallId: w, offset: 1000, width: 900, status: 'demolished' });
    const [d] = f.run('dimension.createSet', {
      viewId: f.viewId,
      items: [
        {
          kind: 'linear',
          refs: [
            { wallId: w, face: 'start', openingId: o },
            { wallId: w, face: 'end', openingId: o },
          ],
        },
      ],
      point: vec(1450, -800),
    });
    expect(f.model.dimensions[d!]).toBeTruthy();
  });
});

describe('hlášení uživatele 2026-11-26: kótování oblouků nástrojem Kóta', () => {
  it('hrany přes obloukovou stěnu (čelo a hrana otvoru) = délka po oblouku na líci blíž kliknutí', () => {
    const f = fixture();
    const [w] = f.run('wall.create', {
      storeyId: f.storeyId,
      typeId: f.type('Zdivo 300'),
      path: { kind: 'arc', start: vec(5000, 0), end: vec(-5000, 0), bulge: 1 },
    });
    const [o] = f.run('opening.create', { wallId: w, offset: 3000, width: 900 });
    const a = { wallId: w!, face: 'start' as const };
    const b = { wallId: w!, face: 'start' as const, openingId: o! };
    const inner = dimensionPair(f.model, a, b, vec(0, 4000));
    expect(inner?.arc?.wallId).toBe(w);
    const outer = dimensionPair(f.model, a, b, vec(0, 6000));
    expect(outer?.arc?.face).not.toBe(inner?.arc?.face);
    const [d] = f.run('dimension.createSet', {
      viewId: f.viewId,
      items: [{ kind: 'linear', refs: [a, b], arc: inner!.arc }],
      point: vec(4000, 3000),
    });
    expect(f.model.dimensions[d!]).toMatchObject({ arc: inner!.arc });
  });

  it('rovnoběžné líce = vzdálenost; různoběžné přímé líce nejdou', () => {
    const f = fixture();
    const a = f.line(vec(0, 0), vec(4000, 0));
    const b = f.line(vec(0, 2000), vec(4000, 2000));
    const c = f.line(vec(6000, 0), vec(8000, 2000));
    const [ra, rb] = [
      { wallId: a, face: 'ref' as const },
      { wallId: b, face: 'ref' as const },
    ];
    expect(dimensionPair(f.model, ra, rb, vec(0, 0))).toEqual({ refs: [ra, rb] });
    expect(
      dimensionPair(f.model, { wallId: a, face: 'ref' }, { wallId: c, face: 'ref' }, vec(0, 0)),
    ).toBeNull();
  });
});

describe('hlášení uživatele 2026-11-26: odkazové čáry řady kót stejně odsazené', () => {
  it('řada přes obvodovou stěnu a příčku: odkazové čáry příčky končí u líce obvodové stěny', () => {
    const f = fixture();
    const [, right, , left] = f.run('wall.rectangle', {
      storeyId: f.storeyId,
      typeId: f.type('Obvodová zateplená 465'),
      a: vec(0, 0),
      b: vec(10000, 6000),
    });
    const p = f.line(vec(5000, 0), vec(5000, 6000), { typeId: f.type('Příčka 125'), autoConnect: true });
    f.run('dimension.createSet', {
      viewId: f.viewId,
      items: [
        {
          kind: 'linear',
          refs: [
            { wallId: left, face: 'opp' },
            { wallId: p, face: 'opp' },
          ],
        },
        {
          kind: 'linear',
          refs: [
            { wallId: p, face: 'opp' },
            { wallId: p, face: 'ref' },
          ],
        },
        {
          kind: 'linear',
          refs: [
            { wallId: p, face: 'ref' },
            { wallId: right, face: 'opp' },
          ],
        },
      ],
      point: vec(5000, -1500),
    });
    const ext = drawView(f.model, f.viewId).primitives.flatMap((x) =>
      x.kind === 'line' && x.source?.role === 'odkazová čára' ? [x.points] : [],
    );
    expect(ext.length).toBe(6);
    const tops = ext.map((pts) => Math.max(...pts.map((q) => q.y)));
    for (const y of tops) expect(y).toBeCloseTo(tops[0]!, 3);
    expect(tops[0]!).toBeLessThan(-465);
  });
});
