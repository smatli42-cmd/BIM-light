import { describe, expect, it } from 'vitest';
import { fixture, near, room } from '../testing/fixture.ts';

describe('katalog-kresleni / část 7 a základ 25: pohne se vybraná, napojené se natáhnou, ostatní stojí', () => {
  it('část 7: odsazení stěny natáhne obě navazující stěny v rozích, protější stojí', () => {
    const f = fixture();
    const [left, top, right, bottom] = room(f);
    const before = { right: f.wall(right).path, bottom: f.wall(bottom).path };
    f.run('wall.offset', { wallId: top, distance: 500 });
    expect(f.wall(top).path.start.y).toBeCloseTo(3500);
    expect(f.wall(left).path.end).toEqual({ x: 0, y: 3500 });
    expect(f.wall(right).path.start).toEqual({ x: 4000, y: 3500 });
    expect(f.wall(right).path.end).toEqual(before.right.end);
    expect(f.wall(bottom).path).toEqual(before.bottom);
  });

  it('část 7: odsazení hostitele natáhne stěnu napojenou T uprostřed', () => {
    const f = fixture();
    const host = f.line({ x: 0, y: 0 }, { x: 6000, y: 0 });
    const stem = f.line(
      { x: 3000, y: 0 },
      { x: 3000, y: -3000 },
      {
        connections: [{ end: 'start', wallId: host, at: 'ATPATH' }],
      },
    );
    f.run('wall.offset', { wallId: host, distance: -1000 });
    expect(f.wall(stem).path.start.y).toBeCloseTo(-1000);
    expect(f.wall(stem).path.end.y).toBeCloseTo(-3000);
  });

  it('část 7: šikmá navazující stěna zachová směr a změní délku', () => {
    const f = fixture();
    const host = f.line({ x: 0, y: 0 }, { x: 6000, y: 0 });
    const slant = f.line(
      { x: 3000, y: 0 },
      { x: 6000, y: -3000 },
      {
        connections: [{ end: 'start', wallId: host, at: 'ATPATH' }],
      },
    );
    f.run('wall.offset', { wallId: host, distance: -1000 });
    expect(near(f.wall(slant).path.start, { x: 4000, y: -1000 }, 1e-6)).toBe(true);
  });

  it('regrese z prototypu: při posunu jedné ze dvou protilehlých stěn se hýbe jen ta vybraná', () => {
    const f = fixture();
    const [left, , right] = room(f);
    const rightBefore = f.wall(right).path;
    f.run('wall.move', { wallIds: [left], vector: { x: -500, y: 0 } });
    expect(f.wall(left).path.start.x).toBe(-500);
    expect(f.wall(right).path).toEqual(rightBefore);
  });

  it('základ 25: posun více stěn najednou natáhne jen napojené', () => {
    const f = fixture();
    const [left, top, right, bottom] = room(f);
    f.run('wall.move', { wallIds: [left, right], vector: { x: 0, y: 200 } });
    expect(f.wall(top).path.start.y).toBe(3000);
    expect(f.wall(bottom).path.start.y).toBe(0);
    expect(f.wall(left).path.start).toEqual({ x: 0, y: 0 });
  });

  it('katalog-kresleni / část 5: tažení uzlu – stěna napojená v rohu jde s ním', () => {
    const f = fixture();
    const [left, top] = room(f);
    f.run('wall.moveEndpoint', { wallId: left, end: 'end', point: { x: 500, y: 3500 } });
    expect(f.wall(top).path.start).toEqual({ x: 500, y: 3500 });
    expect(f.wall(top).path.end).toEqual({ x: 4000, y: 3000 });
  });

  it('základ 25: změna délky posune uchopený konec, kolmá stěna jde s ním, další se natáhne', () => {
    const f = fixture();
    const [left, top, right, bottom] = room(f);
    f.run('wall.setLength', { wallId: top, end: 'end', length: 5000 });
    expect(f.wall(top).path.end).toEqual({ x: 5000, y: 3000 });
    expect(f.wall(right).path.end).toEqual({ x: 5000, y: 0 });
    expect(f.wall(bottom).path.start).toEqual({ x: 5000, y: 0 });
    expect(f.wall(left).path.start).toEqual({ x: 0, y: 0 });
    f.run('wall.setLength', { wallId: top, end: 'start', length: 4500 });
    expect(f.wall(top).path.start).toEqual({ x: 500, y: 3000 });
    expect(f.wall(top).path.end).toEqual({ x: 5000, y: 3000 });
  });

  it('základ 24: odpojení roh zruší a další posun už souseda netáhne', () => {
    const f = fixture();
    const [left, top] = room(f);
    f.run('wall.disconnect', { wallId: left, end: 'end' });
    f.run('wall.offset', { wallId: top, distance: 500 });
    expect(f.wall(left).path.end).toEqual({ x: 0, y: 3000 });
  });
});
