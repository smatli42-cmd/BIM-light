import { describe, expect, it } from 'vitest';
import { vec } from '../geometry/index.ts';
import { fixture, type Fixture } from '../testing/fixture.ts';
import { roomGeometry } from './geometry.ts';
import { allRoomGeometry, areaM2, areaText, nextRoomNumber } from './queries.ts';

const rect = (f: Fixture, type = 'Zdivo 300', w = 4000, h = 3000) =>
  f.run('wall.rectangle', { storeyId: f.storeyId, typeId: f.type(type), a: vec(0, 0), b: vec(w, h) });
const addRoom = (f: Fixture, x: number, y: number, extra: Record<string, unknown> = {}) =>
  f.run('room.create', { storeyId: f.storeyId, point: vec(x, y), ...extra })[0]!;
const geo = (f: Fixture, id: string) => allRoomGeometry(f.model).get(id)!;
const m2 = (f: Fixture, id: string) => areaM2(geo(f, id).area);

describe('prvky stavby 9: místnost z líců stěn (ČSN 73 4301)', () => {
  it('prvky stavby 9: obrys mezi vnitřními líci, plocha, obvod, výška a objem', () => {
    const f = fixture();
    rect(f);
    const id = addRoom(f, 2000, 1500);
    const g = geo(f, id);
    expect(g.state).toBe('ok');
    expect(m2(f, id)).toBe(12);
    expect(Math.round(g.perimeter)).toBe(14000);
    expect(g.height).toBe(3000);
    expect(Math.round(g.volume / 1e9)).toBe(36);
    expect(f.model.rooms[id]!.number).toBe('1.01');
  });

  it('ČSN 73 4301: hranice v líci poslední vrstvy (omítka se počítá do stěny)', () => {
    const f = fixture();
    rect(f, 'Obvodová zateplená 465');
    expect(m2(f, addRoom(f, 2000, 1500))).toBe(12);
  });

  it('prvky stavby 9: příčka rozdělí prostor na dvě místnosti', () => {
    const f = fixture();
    rect(f);
    f.line(vec(2000, 0), vec(2000, 3000), { typeId: f.type('Příčka 100'), referenceLine: 'axis' });
    const a = addRoom(f, 500, 1500);
    const b = addRoom(f, 3500, 1500);
    expect(m2(f, a)).toBe(5.85);
    expect(m2(f, b)).toBe(5.85);
  });

  it('ČSN 73 4301: svislá konstrukce uvnitř (pilíř) se odečte, obvod ji obejde', () => {
    const f = fixture();
    rect(f);
    f.line(vec(1000, 1500), vec(1300, 1500), { referenceLine: 'axis' });
    const id = addRoom(f, 3000, 500);
    const g = geo(f, id);
    expect(g.holes).toHaveLength(1);
    expect(m2(f, id)).toBe(11.91);
    expect(Math.round(g.perimeter)).toBe(14000 + 1200);
  });

  it('ČSN 73 4301: výklenek k podlaze ≥ 0,30 m hluboký a ≥ 2,00 m vysoký se započítá', () => {
    const f = fixture();
    const [left] = rect(f, 'Obvodová zateplená 465');
    const id = addRoom(f, 2000, 1500);
    const niche = { wallId: left, offset: 1000, width: 1000, kind: 'niche', side: 'ref', sill: 0 };
    const [n] = f.run('opening.create', { ...niche, height: 2100, depth: 300 });
    expect(m2(f, id)).toBe(12.3);
    expect(geo(f, id).niches).toEqual([n]);
  });

  it('ČSN 73 4301: mělký, nízký nebo nad podlahou ležící výklenek se nezapočítá', () => {
    const f = fixture();
    const [left] = rect(f, 'Obvodová zateplená 465');
    const id = addRoom(f, 2000, 1500);
    const base = { wallId: left, width: 600, kind: 'niche', side: 'ref' };
    f.run('opening.create', { ...base, offset: 200, sill: 0, height: 2100, depth: 250 });
    f.run('opening.create', { ...base, offset: 1000, sill: 0, height: 1800, depth: 300 });
    f.run('opening.create', { ...base, offset: 2000, sill: 500, height: 2100, depth: 300 });
    expect(m2(f, id)).toBe(12);
  });

  it('ČSN 73 4301: dveřní otvor se nezapočítá (hranice v líci stěny)', () => {
    const f = fixture();
    const [left] = rect(f);
    const id = addRoom(f, 2000, 1500);
    f.run('opening.create', { wallId: left, offset: 1000, width: 900, height: 2100, sill: 0 });
    expect(m2(f, id)).toBe(12);
  });

  it('základ 23: oblouková stěna – kruhová místnost ze dvou oblouků', () => {
    const f = fixture();
    const R = 2000;
    const arc = (a: number, b: number) => ({
      kind: 'arc',
      start: vec(a, 0),
      end: vec(b, 0),
      bulge: -1,
    });
    f.run('wall.create', { storeyId: f.storeyId, typeId: f.type('Zdivo 300'), path: arc(-R, R) });
    f.run('wall.create', { storeyId: f.storeyId, typeId: f.type('Zdivo 300'), path: arc(R, -R) });
    const g = geo(f, addRoom(f, 0, 0));
    expect(g.state).toBe('ok');
    expect(Math.abs(g.area / 1e6 - Math.PI * 4)).toBeLessThan(0.01);
    expect(Math.abs(g.perimeter - 2 * Math.PI * R)).toBeLessThan(5);
  });

  it('prvky stavby 9: při posunu stěny se plocha přepočítá (nic se neukládá)', () => {
    const f = fixture();
    const right = rect(f).find((w) => f.wall(w).path.start.x === 4000 && f.wall(w).path.end.x === 4000)!;
    const id = addRoom(f, 2000, 1500);
    f.run('wall.move', { wallIds: [right], vector: vec(1000, 0) });
    expect(m2(f, id)).toBe(15);
  });

  it('prvky stavby 9: neuzavřená místnost a bod ve stěně', () => {
    const f = fixture();
    const [left] = rect(f);
    const id = addRoom(f, 2000, 1500);
    f.run('selection.delete', { wallIds: [left] });
    expect(geo(f, id).state).toBe('not-enclosed');
    expect(f.editor.execute('room.create', { storeyId: f.storeyId, point: vec(4100, 1500) }).ok).toBe(false);
  });

  it('prvky stavby 9: druhá místnost ve stejném prostoru je nadbytečná', () => {
    const f = fixture();
    rect(f);
    const a = addRoom(f, 1000, 1500);
    const b = addRoom(f, 3000, 1500);
    expect(geo(f, a).state).toBe('ok');
    expect(geo(f, b).state).toBe('redundant');
  });

  it('prvky stavby 9: plochy zvlášť pro stav – bouraná příčka dělí stávající, ne novou místnost', () => {
    const f = fixture();
    f.run('wall.rectangle', {
      storeyId: f.storeyId,
      typeId: f.type('Zdivo 300'),
      a: vec(0, 0),
      b: vec(4000, 3000),
      status: 'existing',
    });
    f.line(vec(2000, 0), vec(2000, 3000), {
      typeId: f.type('Příčka 100'),
      referenceLine: 'axis',
      status: 'demolished',
    });
    expect(m2(f, addRoom(f, 500, 1500, { status: 'existing' }))).toBe(5.85);
    expect(m2(f, addRoom(f, 500, 1500, { status: 'new' }))).toBe(12);
  });

  it('základ 16: ruční obrys se zámkem se nepřepočítá ze stěn; null vrátí výpočet', () => {
    const f = fixture();
    rect(f);
    const id = addRoom(f, 2000, 1500);
    const outline = [vec(0, 0), vec(2000, 0), vec(2000, 1000), vec(0, 1000)];
    f.run('room.update', { roomId: id, manualOutline: outline });
    expect(m2(f, id)).toBe(2);
    f.run('room.update', { roomId: id, manualOutline: null });
    expect(m2(f, id)).toBe(12);
  });

  it('prvky stavby 9: úprava čísla, názvu a výšky; prázdné číslo se odmítne; smazání', () => {
    const f = fixture();
    rect(f);
    const id = addRoom(f, 2000, 1500, { name: 'Kuchyně' });
    f.run('room.update', { roomId: id, number: '1.05', top: { kind: 'height', value: 2600 } });
    const r = f.model.rooms[id]!;
    expect([r.number, r.name, roomGeometry(f.model, r).height]).toEqual(['1.05', 'Kuchyně', 2600]);
    expect(f.editor.execute('room.update', { roomId: id, number: ' ' }).ok).toBe(false);
    f.run('room.delete', { roomIds: [id] });
    expect(f.model.rooms[id]).toBeUndefined();
  });

  it('ČSN 73 4301: zaokrouhlení na 2 desetinná místa, text s desetinnou čárkou', () => {
    expect(areaM2(12_345_678)).toBe(12.35);
    expect(areaM2(12_345_678, 1)).toBe(12.3);
    expect(areaText(12_000_000)).toBe('12,00 m²');
  });

  it('prvky stavby 9: číslování podle podlaží 1.01, 1.02 …', () => {
    const f = fixture();
    rect(f);
    addRoom(f, 2000, 1500);
    expect(nextRoomNumber(f.model, f.storeyId)).toBe('1.02');
  });
});
