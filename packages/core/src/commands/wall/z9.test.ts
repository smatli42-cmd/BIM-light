import { describe, expect, it } from 'vitest';
import { endPoint, vec } from '../../geometry/index.ts';
import { connectionsOf } from '../../wall/queries.ts';
import { fixture } from '../../testing/fixture.ts';

describe('plan-steny / Z9: přenést vlastnosti (pipeta)', () => {
  it('typ, výška a přepisy vlastností přejdou na cíl; stav jen na vyžádání; jeden krok Zpět', () => {
    const f = fixture();
    const src = f.line(vec(0, 0), vec(4000, 0), { typeId: f.type('Příčka 125') });
    const dst = f.line(vec(0, 3000), vec(4000, 3000));
    f.run('wall.setHeight', {
      wallIds: [src],
      height: { baseOffset: 100, top: { kind: 'height', value: 2500 } },
    });
    f.run('wall.setProperties', { wallIds: [src], status: 'existing', properties: { loadBearing: true } });
    f.run('wall.matchProperties', { sourceWallId: src, wallIds: [dst] });
    const w = f.wall(dst);
    expect(w.typeId).toBe(f.type('Příčka 125'));
    expect(w.height).toMatchObject({ baseOffset: 100, top: { kind: 'height', value: 2500 } });
    expect(w.properties).toEqual({ loadBearing: true });
    expect(w.status).not.toBe('existing');
    expect(w.path.start).toEqual(vec(0, 3000));
    f.editor.undo();
    expect(f.wall(dst).typeId).toBe(f.type('Zdivo 300'));
    f.run('wall.matchProperties', { sourceWallId: src, wallIds: [dst], include: ['status'] });
    expect(f.wall(dst).status).toBe('existing');
    expect(f.wall(dst).typeId).toBe(f.type('Zdivo 300'));
  });
});

describe('plan-steny / Z9: výběr stejných', () => {
  it('výchozí typ a podlaží; kritérium stav zúží výsledek', () => {
    const f = fixture();
    const a = f.line(vec(0, 0), vec(4000, 0));
    const b = f.line(vec(0, 3000), vec(4000, 3000));
    f.line(vec(0, 6000), vec(4000, 6000), { typeId: f.type('Příčka 125') });
    f.run('wall.setProperties', { wallIds: [b], status: 'demolished' });
    const find = (by?: string[]) => {
      const r = f.editor.query('wall.findSame', { wallId: a, ...(by ? { by } : {}) });
      return r.ok ? (r.data as string[]) : [];
    };
    expect(find().sort()).toEqual([a, b].sort());
    expect(find(['type', 'status'])).toEqual([a]);
  });
});

describe('plan-steny / Z9: rozdělit s mezerou (Split with Gap)', () => {
  it('kolem bodu vynechá mezeru, části nejsou spojené, otvor za mezerou přejde na druhou část', () => {
    const f = fixture();
    const w = f.line(vec(0, 0), vec(6000, 0));
    const [o] = f.run('opening.create', { wallId: w, offset: 4000, width: 900, height: 2100, sill: 0 });
    const [b] = f.run('wall.split', { wallId: w, point: vec(2000, 0), gap: 100 });
    expect(endPoint(f.wall(w).path, 'end').x).toBeCloseTo(1950);
    expect(endPoint(f.wall(b!).path, 'start').x).toBeCloseTo(2050);
    expect(
      connectionsOf(f.model, w).filter((c) => [c.relating.wallId, c.related.wallId].includes(b!)),
    ).toEqual([]);
    expect(f.model.openings[o!]).toMatchObject({ hostId: b, offset: 1950 });
  });

  it('mezera přes otvor nebo delší než stěna se odmítne', () => {
    const f = fixture();
    const w = f.line(vec(0, 0), vec(6000, 0));
    f.run('opening.create', { wallId: w, offset: 2040, width: 900, height: 2100, sill: 0 });
    expect(f.editor.execute('wall.split', { wallId: w, point: vec(2000, 0), gap: 100 }).ok).toBe(false);
    expect(f.editor.execute('wall.split', { wallId: w, point: vec(500, 0), gap: 2000 }).ok).toBe(false);
  });
});
