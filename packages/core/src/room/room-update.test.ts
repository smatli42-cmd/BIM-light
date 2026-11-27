import { describe, expect, it } from 'vitest';
import { vec } from '../geometry/index.ts';
import { fixture, type Fixture } from '../testing/fixture.ts';
import { allRoomGeometry, areaM2 } from './queries.ts';

const rect = (f: Fixture, type = 'Zdivo 300') =>
  f.run('wall.rectangle', { storeyId: f.storeyId, typeId: f.type(type), a: vec(0, 0), b: vec(4000, 3000) });
const addRoom = (f: Fixture, x: number, y: number) =>
  f.run('room.create', { storeyId: f.storeyId, point: vec(x, y) })[0] as string;
const m2 = (f: Fixture, id: string) => areaM2(allRoomGeometry(f.model).get(id)?.area ?? 0);
const state = (f: Fixture, id: string) => allRoomGeometry(f.model).get(id)?.state;

describe('prvky stavby 9: místnost se přepočítá při každé změně stěn (základ 4, nic se neukládá)', () => {
  it('prvky stavby 9: změna délky stěny posune roh a plocha naroste', () => {
    const f = fixture();
    const bottom = rect(f).find((w) => f.wall(w).path.start.y === 0 && f.wall(w).path.end.y === 0) as string;
    const id = addRoom(f, 2000, 1500);
    const end = f.wall(bottom).path.end.x === 4000 ? 'end' : 'start';
    f.run('wall.setLength', { wallId: bottom, end, length: 5000 });
    expect(m2(f, id)).toBe(15);
  });

  it('prvky stavby 9: změna tloušťky příčky zmenší sousední místnost', () => {
    const f = fixture();
    rect(f);
    const p = f.line(vec(2000, 0), vec(2000, 3000), { typeId: f.type('Příčka 100'), referenceLine: 'axis' });
    const id = addRoom(f, 500, 1500);
    expect(m2(f, id)).toBe(5.85);
    f.run('wall.setThickness', { wallId: p, thickness: 200 });
    expect(m2(f, id)).toBe(5.7);
  });

  it('prvky stavby 9: smazání příčky spojí prostor – druhá místnost je nadbytečná', () => {
    const f = fixture();
    rect(f);
    const p = f.line(vec(2000, 0), vec(2000, 3000), { typeId: f.type('Příčka 100'), referenceLine: 'axis' });
    const a = addRoom(f, 500, 1500);
    const b = addRoom(f, 3500, 1500);
    f.run('selection.delete', { wallIds: [p] });
    expect([m2(f, a), state(f, b)]).toEqual([12, 'redundant']);
  });

  it('ČSN 73 4301: nový výklenek ve stěně plochu hned zvětší, jeho smazání ji vrátí', () => {
    const f = fixture();
    const [left] = rect(f, 'Obvodová zateplená 465');
    const id = addRoom(f, 2000, 1500);
    const niche = { wallId: left, offset: 1000, width: 1000, kind: 'niche', side: 'ref', sill: 0 };
    const [n] = f.run('opening.create', { ...niche, height: 2100, depth: 200 });
    expect(m2(f, id)).toBe(12);
    f.run('opening.update', { openingIds: [n], depth: 300 });
    expect(m2(f, id)).toBe(12.3);
    f.run('selection.delete', { openingIds: [n] });
    expect(m2(f, id)).toBe(12);
  });
});
