import { describe, expect, it } from 'vitest';
import { vec } from '../geometry/index.ts';
import { fixture, type Fixture } from '../testing/fixture.ts';
import { finishText } from './finish.ts';
import { roomSurfaces } from './surfaces.ts';

/** Obdélník stěn 4000 × 3000 po vnitřním líci; vrací [horní, pravá, spodní, levá]. */
const rect = (f: Fixture) =>
  f.run('wall.rectangle', {
    storeyId: f.storeyId,
    typeId: f.type('Zdivo 300'),
    a: vec(0, 0),
    b: vec(4000, 3000),
  });
const addRoom = (f: Fixture, x = 2000, y = 1500) =>
  f.run('room.create', { storeyId: f.storeyId, point: vec(x, y) })[0]!;
const surfaces = (f: Fixture, id: string) => roomSurfaces(f.model, f.model.rooms[id]!);
const m2 = (mm2: number) => Math.round(mm2 / 1e4) / 100;
const byType = (f: Fixture, id: string, typeId: string | null) =>
  m2(
    surfaces(f, id)
      .filter((s) => s.typeId === typeId && s.place === 'wall')
      .reduce((a, s) => a + s.area, 0),
  );

describe('prvky stavby 9: výškové zóny a přepis jedné stěny', () => {
  it('prvky stavby 9: obklad do 1500, nad ním malba – zóny pro celou místnost', () => {
    const f = fixture();
    rect(f);
    const id = addRoom(f);
    f.run('covering.setZones', {
      roomId: id,
      zones: [
        { typeId: 'cov-tiling-300x600', top: 1500 },
        { typeId: 'cov-paint-white', top: null },
      ],
    });
    expect(byType(f, id, 'cov-tiling-300x600')).toBe(21);
    expect(byType(f, id, 'cov-paint-white')).toBe(21);
  });

  it('prvky stavby 9: jednotlivá stěna zóny přepíše, ostatní zůstanou', () => {
    const f = fixture();
    const [top] = rect(f);
    const id = addRoom(f);
    f.run('covering.assign', { roomId: id, place: 'walls', typeId: 'cov-paint-white' });
    f.run('covering.setZones', {
      roomId: id,
      wallId: top,
      side: 'ref',
      zones: [{ typeId: 'cov-tiling-300x600', top: 2000 }],
    });
    const faces = surfaces(f, id).filter((s) => s.place === 'wall' && s.wallId === top);
    expect(faces.map((s) => [s.typeId, m2(s.area)])).toEqual([
      ['cov-tiling-300x600', 8],
      [null, 4],
    ]);
    expect(byType(f, id, 'cov-paint-white')).toBe(30);
    f.run('covering.setZones', { roomId: id, wallId: top, side: 'ref', zones: null });
    expect(byType(f, id, 'cov-paint-white')).toBe(42);
  });

  it('základ 14: přiřazení přežije posun stěny i změnu tloušťky', () => {
    const f = fixture();
    const [top] = rect(f);
    const id = addRoom(f);
    f.run('covering.assign', {
      roomId: id,
      place: 'walls',
      typeId: 'cov-paint-white',
      wallId: top,
      side: 'ref',
    });
    f.run('wall.move', { wallIds: [top], vector: vec(0, 500) });
    const face = surfaces(f, id).find((s) => s.wallId === top && s.place === 'wall')!;
    expect(face.typeId).toBe('cov-paint-white');
    expect(m2(face.area)).toBe(12);
  });

  it('prvky stavby 9: sokl – délka spodní hrany bez dveří', () => {
    const f = fixture();
    const [top] = rect(f);
    const id = addRoom(f);
    f.run('opening.create', { wallId: top, offset: 1000, width: 900, height: 2000, sill: 0 });
    f.run('covering.setZones', {
      roomId: id,
      zones: [
        { typeId: 'cov-skirting-tiles', top: 80 },
        { typeId: 'cov-paint-white', top: null },
      ],
    });
    const skirting = surfaces(f, id).filter((s) => s.typeId === 'cov-skirting-tiles' && s.place === 'wall');
    expect(Math.round(skirting.reduce((a, s) => a + s.length, 0))).toBe(14000 - 900);
  });

  it('kontrola zón: horní hrany musí růst, „ke stropu“ jen poslední', () => {
    const f = fixture();
    rect(f);
    const id = addRoom(f);
    const set = (zones: unknown) => () => f.run('covering.setZones', { roomId: id, zones });
    expect(
      set([
        { typeId: null, top: 1500 },
        { typeId: null, top: 1000 },
      ]),
    ).toThrow(/růst/);
    expect(
      set([
        { typeId: null, top: null },
        { typeId: null, top: 1000 },
      ]),
    ).toThrow(/poslední/);
    expect(set([{ typeId: 'nic', top: null }])).toThrow(/neexistuje/);
  });
});

describe('prvky stavby 9: líce kolem sloupu, v T a po oblouku (základ 23)', () => {
  it('ČSN 73 4301: sloup uvnitř má vlastní líce (ostrov)', () => {
    const f = fixture();
    rect(f);
    f.line(vec(1000, 1500), vec(1300, 1500), { referenceLine: 'axis' });
    const id = addRoom(f, 3000, 500);
    const walls = surfaces(f, id).filter((s) => s.place === 'wall');
    expect(m2(walls.reduce((a, s) => a + s.area, 0))).toBe(m2((14000 + 1200) * 3000));
  });

  it('prvky stavby 9: příčka v T rozdělí líc obvodové stěny mezi dvě místnosti', () => {
    const f = fixture();
    const [top] = rect(f);
    f.line(vec(2000, 0), vec(2000, 3000), { typeId: f.type('Příčka 100'), referenceLine: 'axis' });
    const a = addRoom(f, 500, 1500);
    const b = addRoom(f, 3500, 1500);
    const len = (id: string) =>
      surfaces(f, id).find((s) => s.wallId === top && s.place === 'wall')!.faceLength;
    expect(Math.round(len(a)!)).toBe(1950);
    expect(Math.round(len(b)!)).toBe(1950);
  });

  it('základ 23: líc obloukové stěny se rozvine po délce, rámec je válec', () => {
    const f = fixture();
    const [top] = rect(f);
    f.run('wall.curve', { wallId: top, through: vec(2000, 3800) });
    const id = addRoom(f);
    const face = surfaces(f, id).find((s) => s.wallId === top && s.place === 'wall')!;
    expect(face.frame.kind).toBe('cylinder');
    expect(face.faceLength!).toBeGreaterThan(4000);
    expect(face.area).toBeCloseTo(face.faceLength! * 3000, -3);
  });
});

describe('prvky stavby 9: povrchy v razítku a výpisu místností z přiřazení', () => {
  it('prvky stavby 9: text povrchů z úprav, ruční text má přednost', () => {
    const f = fixture();
    rect(f);
    const id = addRoom(f);
    f.run('covering.setZones', {
      roomId: id,
      zones: [
        { typeId: 'cov-tiling-300x600', top: 1500 },
        { typeId: 'cov-paint-white', top: null },
      ],
    });
    f.run('covering.assign', { roomId: id, place: 'floor', typeId: 'cov-floor-tiles-600' });
    const r = () => f.model.rooms[id]!;
    expect(finishText(f.model, r(), 'wallFinish')).toBe('Obklad 300×600 bílý do 1,50 m, Malba bílá');
    expect(finishText(f.model, r(), 'floorFinish')).toBe('Dlažba 600×600 šedá');
    expect(finishText(f.model, r(), 'ceilingFinish')).toBeNull();
    f.run('room.update', { roomId: id, floorFinish: 'stávající parkety' });
    expect(finishText(f.model, r(), 'floorFinish')).toBe('stávající parkety');
  });
});
