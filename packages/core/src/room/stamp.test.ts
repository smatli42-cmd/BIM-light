import { describe, expect, it } from 'vitest';
import type { Primitive } from '../drawing/primitives.ts';
import { vec } from '../geometry/index.ts';
import { exportDisplayPackage, parseDisplayPackage } from '../style/package.ts';
import { fixture, type Fixture } from '../testing/fixture.ts';
import { drawView } from '../view/draw-view.ts';
import { projectV23toV24 } from './migrate-v22.ts';

const setup = () => {
  const f = fixture();
  f.run('wall.rectangle', {
    storeyId: f.storeyId,
    typeId: f.type('Zdivo 300'),
    a: vec(0, 0),
    b: vec(4000, 3000),
  });
  const [id] = f.run('room.create', { storeyId: f.storeyId, point: vec(2000, 1500), name: 'Pokoj' });
  return { f, id: id as string };
};
const prims = (f: Fixture, id: string) =>
  drawView(f.model, f.viewId).primitives.filter((p) => p.source.elementId === id);
const lines = (f: Fixture, id: string) =>
  prims(f, id).flatMap((p: Primitive) => (p.kind === 'text' ? [p.text] : []));
const fill = (f: Fixture, id: string) => {
  const p = prims(f, id).find((x) => x.kind === 'fill');
  return p?.kind === 'fill' ? p.color : null;
};
const styleId = (f: Fixture) => f.model.views[f.viewId]?.styleId as string;
const cat = (f: Fixture, name: string) =>
  Object.values(f.model.roomCategories).find((c) => c.name === name)?.id as string;

describe('základy 27, 31 / prvky stavby 9: obsah razítka místnosti je data stylu', () => {
  it('základ 27: výchozí razítko = číslo, název, plocha', () => {
    const { f, id } = setup();
    expect(lines(f, id)).toEqual(['1.01', 'Pokoj', '12,00 m²']);
  });

  it('základ 27: style.setRoomStamp – vybrané údaje v zadaném pořadí, prázdné se vynechají', () => {
    const { f, id } = setup();
    f.run('room.update', {
      roomId: id,
      categoryId: cat(f, 'Obytné'),
      floorFinish: 'dubové parkety',
      occupants: 2,
      temperature: 20,
      floorOffset: 150,
      note: 'okno na jih',
    });
    const fields = ['name', 'number', 'livingArea', 'utilityArea', 'height', 'floorLevel', 'category'];
    f.run('style.setRoomStamp', {
      styleId: styleId(f),
      fields: [
        ...fields,
        'status',
        'floorFinish',
        'wallFinish',
        'occupants',
        'temperature',
        'note',
        'storey',
      ],
    });
    expect(lines(f, id)).toEqual([
      'Pokoj',
      '1.01',
      'obytná 12,00 m²',
      'sv. v. 2,85 m',
      '+0,150',
      'Obytné',
      'nový',
      'podlaha: dubové parkety',
      '2 os.',
      '20 °C',
      'okno na jih',
      '1.NP',
    ]);
  });

  it('základ 31: razítko se přenáší s nastavením zobrazení (export / import)', () => {
    const { f } = setup();
    f.run('style.setRoomStamp', { styleId: styleId(f), fields: ['number', 'volume'] });
    const back = parseDisplayPackage(exportDisplayPackage(f.model.display));
    expect(back.ok && back.settings.styles[styleId(f)]?.roomStamp).toEqual(['number', 'volume']);
  });
});

describe('prvky stavby 9 / základ 11: barva místnosti přes funkci grafiky', () => {
  it('základ 11: barva kategorie = výchozí výplň (patro 1); vlastní barva místnosti ji přebije (patro 5)', () => {
    const { f, id } = setup();
    expect(fill(f, id)).toBeNull();
    f.run('room.update', { roomId: id, categoryId: cat(f, 'Hygienické') });
    expect(fill(f, id)).toBe(f.model.roomCategories[cat(f, 'Hygienické')]?.color);
    f.run('room.update', { roomId: id, color: '#ff8800' });
    expect(fill(f, id)).toBe('#ff8800');
    f.run('room.update', { roomId: id, color: null });
    f.run('roomCategory.update', { categoryId: cat(f, 'Hygienické'), color: '#00aaff' });
    expect(fill(f, id)).toBe('#00aaff');
  });

  it('základ 30: pravidlo grafiky podle kategorie místnosti (vlastnost roomCategory)', () => {
    const { f, id } = setup();
    f.run('room.update', { roomId: id, categoryId: cat(f, 'Komunikace') });
    const rule = {
      id: 'r1',
      name: 'Komunikace šedě',
      conditions: [{ property: 'roomCategory', op: 'eq' as const, value: cat(f, 'Komunikace') }],
      effect: { fillColor: '#999999' },
    };
    const d = f.model.display;
    const combo = Object.values(d.overrideCombinations)[0];
    const m = {
      ...f.model,
      display: {
        ...d,
        rules: { ...d.rules, r1: rule },
        overrideCombinations: { ...d.overrideCombinations, x: { id: 'x', name: 'x', ruleIds: ['r1'] } },
        styles: Object.fromEntries(
          Object.entries(d.styles).map(([k, s]) => [k, { ...s, overrideCombinationId: 'x' }]),
        ),
      },
    };
    const p = drawView(m, f.viewId).primitives.find((x) => x.source.elementId === id && x.kind === 'fill');
    expect(p?.kind === 'fill' && p.color).toBe('#999999');
    expect(combo).toBeTruthy();
  });

  it('ČSN 73 4301: obytná a užitková plocha podle druhu plochy kategorie', () => {
    const { f, id } = setup();
    const list = () => {
      const r = f.editor.query('room.list', {});
      return (r.ok ? r.data : []) as { livingArea: number; utilityArea: number }[];
    };
    expect(list()[0]).toMatchObject({ livingArea: 0, utilityArea: 12 });
    f.run('room.update', { roomId: id, categoryId: cat(f, 'Obytné') });
    expect(list()[0]).toMatchObject({ livingArea: 12, utilityArea: 0 });
  });

  it('prvky stavby 9: smazaná kategorie – místnost zůstane bez kategorie a bez výplně', () => {
    const { f, id } = setup();
    f.run('room.update', { roomId: id, categoryId: cat(f, 'Skladové') });
    f.run('roomCategory.delete', { categoryId: cat(f, 'Skladové') });
    expect([f.model.rooms[id]?.categoryId, fill(f, id)]).toEqual([undefined, null]);
  });

  it('základ 9: migrace 23 → 24 doplní výchozí kategorie, existující nechá', () => {
    expect(Object.keys(projectV23toV24({})['roomCategories'] as object).length).toBe(6);
    const own = { a: { id: 'a' } };
    expect(projectV23toV24({ roomCategories: own })['roomCategories']).toBe(own);
  });
});
