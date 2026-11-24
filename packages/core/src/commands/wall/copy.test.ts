import { describe, expect, it } from 'vitest';
import { vec } from '../../geometry/index.ts';
import { fixture, near, room } from '../../testing/fixture.ts';
import { allWalls, connectionsOf } from '../../wall/queries.ts';

describe('pravidla-interakce / Příkazy nad výběrem', () => {
  it('Kopie (K): kopie stěn se vzájemnými napojeními, originál stojí', () => {
    const f = fixture();
    const ids = room(f);
    const created = f.run('wall.copy', {
      wallIds: ids,
      transforms: [{ kind: 'translate', vector: vec(10000, 0) }],
    });
    expect(created.length).toBe(4);
    expect(allWalls(f.model).length).toBe(8);
    expect(near(f.wall(created[0]!).path.start, vec(10000, 0))).toBe(true);
    expect(connectionsOf(f.model, created[0]!).length).toBe(2);
    expect(near(f.wall(ids[0]).path.start, vec(0, 0))).toBe(true);
  });

  it('Pole (P): více transformací = více kopií; radiální pole = otočení', () => {
    const f = fixture();
    const id = f.line(vec(0, 0), vec(1000, 0));
    const lin = f.run('wall.copy', {
      wallIds: [id],
      transforms: [1, 2, 3].map((i) => ({ kind: 'translate', vector: vec(0, i * 2000) })),
    });
    expect(lin.length).toBe(3);
    const rad = f.run('wall.copy', {
      wallIds: [id],
      transforms: [90, 180].map((a) => ({ kind: 'rotate', center: vec(0, 0), angleDeg: a })),
    });
    expect(near(f.wall(rad[0]!).path.end, vec(0, 1000), 1e-6)).toBe(true);
  });

  it('Zrcadlit (F): zrcadlová kopie má tloušťku na druhé straně; Shift nahradí původní', () => {
    const f = fixture();
    const id = f.line(vec(0, 0), vec(1000, 0));
    const [m] = f.run('wall.copy', {
      wallIds: [id],
      transforms: [{ kind: 'mirror', a: vec(0, 500), b: vec(10, 500) }],
    });
    expect(f.wall(m!).side).toBe('right');
    expect(f.wall(m!).path.start.y).toBeCloseTo(1000, 6);
    f.run('wall.copy', {
      wallIds: [id],
      transforms: [{ kind: 'mirror', a: vec(2000, 0), b: vec(2000, 10) }],
      replace: true,
    });
    expect(f.model.elements[id]).toBeUndefined();
  });

  it('kopie, jejíž konec padne na volný konec jiné stěny, se napojí rohem', () => {
    const f = fixture();
    const a = f.line(vec(0, 0), vec(1000, 0));
    const [b] = f.run('wall.copy', {
      wallIds: [a],
      transforms: [{ kind: 'rotate', center: vec(1000, 0), angleDeg: -90 }],
    });
    expect(connectionsOf(f.model, b!).length).toBe(1);
  });

  it('Vložit (Ctrl+V): stěny ze schránky posunuté o vektor', () => {
    const f = fixture();
    const created = f.run('wall.paste', {
      storeyId: f.storeyId,
      walls: [
        {
          typeId: f.type('Zdivo 300'),
          path: { kind: 'line', start: vec(0, 0), end: vec(1000, 0) },
          side: 'left',
          referenceLine: 'face',
        },
      ],
      vector: vec(0, 5000),
    });
    expect(near(f.wall(created[0]!).path.start, vec(0, 5000))).toBe(true);
  });

  it('Do rohu (T): dvě stěny se prodlouží do společného rohu a napojí', () => {
    const f = fixture();
    const a = f.line(vec(0, 0), vec(3000, 0));
    const b = f.line(vec(4000, 500), vec(4000, 3000));
    f.run('wall.trimToCorner', { wallA: a, keepA: vec(1000, 0), wallB: b, keepB: vec(4000, 2000) });
    expect(near(f.wall(a).path.end, vec(4000, 0))).toBe(true);
    expect(near(f.wall(b).path.start, vec(4000, 0))).toBe(true);
    expect(connectionsOf(f.model, a).length).toBe(1);
  });

  it('Zarovnat (L): líc stěny se posune do přímky s referenčním lícem', () => {
    const f = fixture();
    const r = f.line(vec(0, 0), vec(1000, 0));
    const t = f.line(vec(2000, 400), vec(3000, 400));
    f.run('wall.align', { reference: { wallId: r, face: 'ref' }, target: { wallId: t, face: 'ref' } });
    expect(f.wall(t).path.start.y).toBeCloseTo(0, 6);
  });

  it('Obdélník (B): čtyři napojené stěny po směru hodin, tloušťka ven', () => {
    const f = fixture();
    const ids = f.run('wall.rectangle', {
      storeyId: f.storeyId,
      typeId: f.type('Zdivo 300'),
      a: vec(0, 0),
      b: vec(4000, 3000),
    });
    expect(ids.length).toBe(4);
    for (const id of ids) expect(connectionsOf(f.model, id).length).toBe(2);
    expect(f.wall(ids[0]!).path.start).toEqual(vec(0, 3000));
  });
});
