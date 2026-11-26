import { describe, expect, it } from 'vitest';
import { vec } from '../geometry/index.ts';
import { fixture } from '../testing/fixture.ts';
import { measureDimension } from './measure.ts';

/** Místnost 10 × 6 m z obvodové stěny 465, příčka 125 v x = 5000 a okno ve spodní stěně. */
function house() {
  const f = fixture();
  const [, , bottom] = f.run('wall.rectangle', {
    storeyId: f.storeyId,
    typeId: f.type('Obvodová zateplená 465'),
    a: vec(0, 0),
    b: vec(10000, 6000),
  });
  f.line(vec(5000, 0), vec(5000, 6000), { typeId: f.type('Příčka 125'), autoConnect: true });
  f.run('opening.create', { wallId: bottom, offset: 2000, width: 1500, height: 1500, sill: 900 });
  return { f, bottom: bottom! };
}

const values = (f: ReturnType<typeof fixture>, ids: readonly string[]) =>
  ids.map((id) => Math.round(measureDimension(f.model, f.model.dimensions[id]!)));

describe('pokyn uživatele 2026-11-26: okótovat celou stěnu i s příčkami a šířkami všech stěn', () => {
  it('řetěz: tloušťka rohové stěny – okno – příčka – tloušťka rohové stěny; celková délka zvlášť', () => {
    const { f, bottom } = house();
    const ids = f.run('dimension.wholeWall', { wallId: bottom, viewId: f.viewId, walls: true });
    const v = values(f, ids);
    const total = v.at(-1)!;
    const chain = v.slice(0, -1);
    expect(total).toBe(10930);
    expect(chain.reduce((a, b) => a + b, 0)).toBe(10930);
    expect(chain[0]).toBe(465);
    expect(chain.at(-1)).toBe(465);
    expect(chain).toContain(125);
    expect(chain).toContain(1500);
    expect(chain).toHaveLength(7);
  });

  it('bez volby walls zůstane řetěz jako dřív (jen otvory)', () => {
    const { f, bottom } = house();
    const v = values(f, f.run('dimension.wholeWall', { wallId: bottom, viewId: f.viewId }));
    expect(v.slice(0, -1)).toHaveLength(3);
  });
});
