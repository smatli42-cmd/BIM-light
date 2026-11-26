import { describe, expect, it } from 'vitest';
import { vec } from '../../geometry/index.ts';
import { fixture, near, room } from '../../testing/fixture.ts';
import { connectionsOf, wallSection } from '../../wall/queries.ts';

describe('koncepce-rozhrani / Ctrl+K Změnit velikost (vzor Arditu, Resize v Archicadu)', () => {
  it('vzdálenosti od výchozího bodu se změní v poměru, tloušťka a napojení zůstávají', () => {
    const f = fixture();
    const ids = room(f);
    const before = wallSection(f.model, f.wall(ids[0])).thickness;
    f.run('wall.scale', { wallIds: ids, origin: vec(0, 0), factor: 1.5 });
    const xs = ids.flatMap((id) => [f.wall(id).path.start, f.wall(id).path.end]);
    expect(Math.max(...xs.map((p) => p.x))).toBeCloseTo(6000, 6);
    expect(Math.max(...xs.map((p) => p.y))).toBeCloseTo(4500, 6);
    expect(wallSection(f.model, f.wall(ids[0])).thickness).toBe(before);
    expect(connectionsOf(f.model, ids[0]).length).toBe(2);
  });

  it('otvor drží poměrnou polohu středu; šířka se mění jen na přání', () => {
    const f = fixture();
    const id = f.line(vec(0, 0), vec(4000, 0));
    const [o] = f.run('opening.create', { wallId: id, offset: 1000, width: 1000, height: 2000, sill: 0 });
    f.run('wall.scale', { wallIds: [id], origin: vec(0, 0), factor: 2 });
    expect(near(f.wall(id).path.end, vec(8000, 0))).toBe(true);
    expect(f.model.openings[o!]).toMatchObject({ offset: 2500, width: 1000, height: 2000 });
    f.run('wall.scale', { wallIds: [id], origin: vec(0, 0), factor: 0.5, scaleOpenings: true });
    expect(f.model.openings[o!]).toMatchObject({ offset: 1250, width: 500, height: 2000 });
  });

  it('poměr 0 nebo záporný se odmítne', () => {
    const f = fixture();
    const id = f.line(vec(0, 0), vec(4000, 0));
    expect(() => f.run('wall.scale', { wallIds: [id], origin: vec(0, 0), factor: 0 })).toThrow();
  });
});
