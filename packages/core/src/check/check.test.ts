import { describe, expect, it } from 'vitest';
import { endPoint, vec } from '../geometry/index.ts';
import { fixture, room } from '../testing/fixture.ts';
import { checkWalls } from './walls.ts';

const kinds = (f: ReturnType<typeof fixture>) => checkWalls(f.model).map((i) => i.kind);

describe('plan-steny / Z10: kontroly modelu (varují, nebrání)', () => {
  it('napojená místnost je bez varování', () => {
    const f = fixture();
    room(f);
    expect(checkWalls(f.model)).toEqual([]);
  });

  it('překrývající se rovnoběžné stěny; bourání a nová stěna na stejném místě nevadí', () => {
    const f = fixture();
    const a = f.line(vec(0, 0), vec(4000, 0));
    const b = f.line(vec(3000, 100), vec(6000, 100));
    expect(checkWalls(f.model).find((i) => i.kind === 'overlap')?.wallIds).toEqual([a, b]);
    // tatáž dvojice se nehlásí ještě jako nenapojené konce (jedno varování na jednu chybu)
    expect(kinds(f)).toEqual(['overlap']);
    f.run('wall.setProperties', { wallIds: [a], status: 'demolished' });
    expect(kinds(f)).not.toContain('overlap');
  });

  it('stěny vedle sebe (líc na líci) se nepřekrývají', () => {
    const f = fixture();
    f.line(vec(0, 0), vec(4000, 0));
    f.line(vec(0, 300), vec(4000, 300));
    expect(kinds(f)).not.toContain('overlap');
  });

  it('nenapojený konec u jiné stěny (mezera 60 mm od líce)', () => {
    const f = fixture();
    const host = f.line(vec(0, 0), vec(6000, 0));
    const part = f.line(vec(3000, 3000), vec(3000, 360));
    const issue = checkWalls(f.model).find((i) => i.kind === 'unconnected');
    expect(issue?.wallIds).toEqual([part, host]);
    expect(issue?.at).toEqual(endPoint(f.wall(part).path, 'end'));
  });

  it('příliš krátká stěna (mez jde zadat)', () => {
    const f = fixture();
    f.line(vec(0, 0), vec(80, 0));
    expect(kinds(f)).toContain('short');
    expect(checkWalls(f.model, { minLength: 50 }).map((i) => i.kind)).not.toContain('short');
  });
});

describe('plan-steny / Z10: vybourat úsek stěny', () => {
  it('rozdělí stěnu ve dvou bodech, prostřední část má stav bourání, krajní zůstanou', () => {
    const f = fixture();
    const w = f.line(vec(0, 0), vec(6000, 0));
    f.run('wall.setProperties', { wallIds: [w], status: 'existing' });
    const [mid] = f.run('wall.demolishPart', { wallId: w, from: vec(4000, 50), to: vec(2000, -20) });
    expect(f.wall(mid!).status).toBe('demolished');
    expect(endPoint(f.wall(mid!).path, 'start').x).toBeCloseTo(2000);
    expect(endPoint(f.wall(mid!).path, 'end').x).toBeCloseTo(4000);
    const statuses = Object.values(f.model.elements)
      .map((e) => e.status)
      .sort();
    expect(statuses).toEqual(['demolished', 'existing', 'existing']);
    f.editor.undo();
    expect(Object.keys(f.model.elements)).toEqual([w]);
  });

  it('úsek až ke konci stěny: rozdělí jen jednou', () => {
    const f = fixture();
    const w = f.line(vec(0, 0), vec(6000, 0));
    f.run('wall.demolishPart', { wallId: w, from: vec(4000, 0), to: vec(7000, 0) });
    expect(Object.keys(f.model.elements)).toHaveLength(2);
  });
});
