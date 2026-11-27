import { describe, expect, it } from 'vitest';
import { vec } from '../geometry/index.ts';
import { fixture, type Fixture } from '../testing/fixture.ts';
import { slabArea } from './geometry.ts';
import { getSlab } from './queries.ts';

const typeNamed = (f: Fixture, name: string) =>
  Object.values(f.model.slabTypes).find((t) => t.name === name)!.id;
const rect = (f: Fixture) =>
  f.run('wall.rectangle', {
    storeyId: f.storeyId,
    typeId: f.type('Zdivo 300'),
    a: vec(0, 0),
    b: vec(4000, 3000),
  });
const right = (f: Fixture, ids: readonly string[]) =>
  ids.find((w) => f.wall(w).path.start.x === 4000 && f.wall(w).path.end.x === 4000)!;
const roomAt = (f: Fixture, x: number, y: number) =>
  f.run('room.create', { storeyId: f.storeyId, point: vec(x, y) })[0] as string;
const floorIn = (f: Fixture, roomId: string) =>
  f.run('slab.create', { storeyId: f.storeyId, typeId: typeNamed(f, 'Podlaha anhydrit 150'), roomId })[0]!;
const fromWalls = (f: Fixture, wallIds: readonly string[]) =>
  f.run('slab.create', {
    storeyId: f.storeyId,
    typeId: typeNamed(f, 'ŽB strop 250'),
    walls: { wallIds },
  })[0]!;
const m2 = (f: Fixture, id: string) => Math.round(slabArea(getSlab(f.model, id)) / 1e4) / 100;
const maxX = (f: Fixture, id: string) =>
  Math.round(Math.max(...getSlab(f.model, id).outline.map((p) => p.x)));

describe('desky – vazba: podlaha patří místnosti (základ 14, Revit podlaha z hranice místnosti)', () => {
  it('desky – vazba 1: podlaha podle místnosti má obrys místnosti a vazbu room', () => {
    const f = fixture();
    rect(f);
    const s = floorIn(f, roomAt(f, 2000, 1500));
    expect(m2(f, s)).toBe(12);
    expect(getSlab(f.model, s).link).toMatchObject({ kind: 'room' });
    expect(getSlab(f.model, s).slabFunction).toBe('floor');
  });

  it('desky – vazba 1: posun stěny → obrys podlahy se změní', () => {
    const f = fixture();
    const walls = rect(f);
    const s = floorIn(f, roomAt(f, 2000, 1500));
    f.run('wall.move', { wallIds: [right(f, walls)], vector: vec(1000, 0) });
    expect(maxX(f, s)).toBe(5000);
    expect(m2(f, s)).toBe(15);
  });

  it('desky – vazba 4: nová příčka podlahu vázanou na místnost zmenší (podlahy jsou po místnostech)', () => {
    const f = fixture();
    rect(f);
    const s = floorIn(f, roomAt(f, 1000, 1500));
    f.line(vec(2000, 0), vec(2000, 3000), { typeId: f.type('Příčka 100'), referenceLine: 'axis' });
    expect(m2(f, s)).toBe(5.85);
  });

  it('desky – vazba 1: sloup v místnosti = ostrov podlahy (plocha bez něj)', () => {
    const f = fixture();
    rect(f);
    f.run('wall.rectangle', {
      storeyId: f.storeyId,
      typeId: f.type('Příčka 100'),
      a: vec(1800, 1300),
      b: vec(2200, 1700),
    });
    const s = floorIn(f, roomAt(f, 500, 500));
    expect(getSlab(f.model, s).holes).toHaveLength(1);
    expect(m2(f, s)).toBeLessThan(12);
  });

  it('desky – vazba 2: nosná deska podle stěn se po posunu stěny přepočítá', () => {
    const f = fixture();
    const walls = rect(f);
    const s = fromWalls(f, walls);
    expect(getSlab(f.model, s).link).toMatchObject({ kind: 'walls', boundary: 'face' });
    f.run('wall.move', { wallIds: [right(f, walls)], vector: vec(-500, 0) });
    expect(maxX(f, s)).toBe(3500);
  });

  it('desky – vazba 2: smazaná místnost vazbu zruší, deska zůstane', () => {
    const f = fixture();
    rect(f);
    const r = roomAt(f, 2000, 1500);
    const s = floorIn(f, r);
    f.run('selection.delete', { roomIds: [r] });
    expect(getSlab(f.model, s).link).toBeUndefined();
    expect(m2(f, s)).toBe(12);
  });
});

describe('desky – vazba 3: ruční úprava obrysu vazbu zamkne (základ 16)', () => {
  it('desky – vazba 3: posun bodu → vazba zamčená, posun stěny obrys nemění', () => {
    const f = fixture();
    const walls = rect(f);
    const s = floorIn(f, roomAt(f, 2000, 1500));
    const i = getSlab(f.model, s).outline.findIndex((p) => p.x > 3999 && p.y > 2999);
    f.run('slab.moveVertex', { slabId: s, index: i, point: vec(3500, 3000) });
    expect(getSlab(f.model, s).link?.locked).toBe(true);
    f.run('wall.move', { wallIds: [right(f, walls)], vector: vec(1000, 0) });
    expect(maxX(f, s)).toBe(4000);
  });

  it('desky – vazba 3: posun desky i nový obrys zamknou; obnovení vazby obrys znovu spočítá', () => {
    const f = fixture();
    const walls = rect(f);
    const s = fromWalls(f, walls);
    f.run('slab.move', { slabIds: [s], vector: vec(100, 0) });
    expect(getSlab(f.model, s).link?.locked).toBe(true);
    f.run('slab.restoreLink', { slabId: s });
    expect(getSlab(f.model, s).link?.locked).toBeUndefined();
    expect(maxX(f, s)).toBe(4000);
    f.run('slab.setOutline', { slabId: s, outline: [vec(0, 0), vec(1000, 0), vec(1000, 1000)] });
    expect(getSlab(f.model, s).link?.locked).toBe(true);
  });

  it('desky – vazba 3: kopie desky je ruční; zrušení vazby nechá obrys', () => {
    const f = fixture();
    const s = fromWalls(f, rect(f));
    const [c] = f.run('slab.move', { slabIds: [s], vector: vec(0, 5000), copy: true });
    expect(getSlab(f.model, c!).link).toBeUndefined();
    f.run('slab.unlink', { slabIds: [s] });
    expect(getSlab(f.model, s).link).toBeUndefined();
    expect(maxX(f, s)).toBe(4000);
  });

  it('desky – vazba 6: ruční deska jde navázat na místnost i na stěny', () => {
    const f = fixture();
    const walls = rect(f);
    const r = roomAt(f, 2000, 1500);
    const [s] = f.run('slab.create', {
      storeyId: f.storeyId,
      typeId: typeNamed(f, 'Podlaha anhydrit 150'),
      rect: { a: vec(500, 500), b: vec(1500, 1500) },
    });
    f.run('slab.linkRoom', { slabId: s!, roomId: r });
    expect(m2(f, s!)).toBe(12);
    f.run('slab.linkWalls', { slabId: s!, wallIds: walls });
    expect(getSlab(f.model, s!).link?.kind).toBe('walls');
  });
});
