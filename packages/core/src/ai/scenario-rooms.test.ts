// AI scénář místnosti (prvky stavby 9): vložení bodem uvnitř, rozdělení příčkou, přepočet po posunu
// stěny, úprava, výpis místností a smazání – jen JSON voláními nástrojů.
import { describe, expect, it } from 'vitest';
import { must, room, start, type Info } from './scenario-helpers.ts';

interface RoomRow {
  id: string;
  number: string;
  name: string;
  area: number;
  perimeter: number;
  volume: number;
  state: string;
  outline: { x: number; y: number }[];
}
interface Table {
  rows: { kind: string; cells: Record<string, unknown> }[];
}

describe('AI scénář: místnosti', () => {
  it('místnost klikem dovnitř, příčka ji rozdělí, posun stěny přepočítá plochu', () => {
    const c = start();
    const walls = room(c);
    const [kitchen] = c.ai.call<string[]>('room.create', {
      storeyId: c.storeyId,
      point: { x: 1000, y: 2000 },
      name: 'Kuchyně',
    });
    const list = () => c.ai.call<RoomRow[]>('room.list', { storeyId: c.storeyId });
    expect(must(list()[0])).toMatchObject({ number: '1.01', name: 'Kuchyně', area: 24, state: 'ok' });
    expect(must(list()[0]).volume).toBe(72);

    const types = c.ai.call<Info>('project.info').wallTypes;
    const partition = must(types.find((t) => t.name === 'Příčka 100')).id;
    c.ai.call('wall.create', {
      storeyId: c.storeyId,
      typeId: partition,
      referenceLine: 'axis',
      path: { kind: 'line', start: { x: 3000, y: 0 }, end: { x: 3000, y: 4000 } },
    });
    const [living] = c.ai.call<string[]>('room.create', {
      storeyId: c.storeyId,
      point: { x: 5000, y: 2000 },
    });
    c.ai.call('room.update', { roomId: living, name: 'Pokoj', number: '1.02' });
    expect(list().map((r) => [r.number, r.name, r.area])).toEqual([
      ['1.01', 'Kuchyně', 11.8],
      ['1.02', 'Pokoj', 11.8],
    ]);

    // Pravá stěna o 1 m dál: pokoj se zvětší o 4 m², kuchyně stojí.
    c.ai.call('wall.move', { wallIds: [must(walls[2])], vector: { x: 1000, y: 0 } });
    expect(list().map((r) => r.area)).toEqual([11.8, 15.8]);

    const defs = c.ai.call<{ id: string; source: string; name: string }[]>('schedule.list');
    const def = must(defs.find((d) => d.source === 'rooms'));
    expect(def.name).toBe('Výpis místností');
    const t = c.ai.call<Table>('schedule.table', { scheduleId: def.id });
    const items = t.rows.filter((r) => r.kind === 'item').map((r) => [r.cells['number'], r.cells['area']]);
    expect(items).toEqual([
      ['1.01', 11.8],
      ['1.02', 15.8],
    ]);

    c.ai.call('room.delete', { roomIds: [must(kitchen)] });
    c.ai.call('selection.delete', { roomIds: [must(living)] });
    expect(list()).toEqual([]);
  });

  it('místnost mimo uzavřený prostor se hlásí jako neuzavřená, bod ve stěně se odmítne', () => {
    const c = start();
    room(c);
    c.ai.call('room.create', { storeyId: c.storeyId, point: { x: 9000, y: 9000 } });
    expect(must(c.ai.call<RoomRow[]>('room.list')[0]).state).toBe('not-enclosed');
    expect(() => c.ai.call('room.create', { storeyId: c.storeyId, point: { x: -100, y: 2000 } })).toThrow();
  });

  it('kategorie, barva, vlastnosti a obsah razítka jen JSON voláními', () => {
    const c = start();
    room(c);
    const [id] = c.ai.call<string[]>('room.create', { storeyId: c.storeyId, point: { x: 1000, y: 2000 } });
    const cats = c.ai.call<{ id: string; name: string; areaKind: string }[]>('roomCategory.list');
    const living = must(cats.find((x) => x.areaKind === 'living')).id;
    const [mine] = c.ai.call<string[]>('roomCategory.create', {
      name: 'Ateliér',
      color: '#ffd0a0',
      areaKind: 'living',
    });
    c.ai.call('room.update', {
      roomId: id,
      categoryId: mine,
      color: '#a0d0ff',
      floorFinish: 'keramická dlažba',
      occupants: 3,
      temperature: 22,
      note: 'vymyšlená poznámka',
    });
    const row = must(c.ai.call<(RoomRow & Record<string, unknown>)[]>('room.list')[0]);
    expect(row).toMatchObject({ category: 'Ateliér', livingArea: 24, utilityArea: 0, color: '#a0d0ff' });
    expect(row['props']).toMatchObject({ floorFinish: 'keramická dlažba', occupants: 3, temperature: 22 });
    const view = c.ai.call<{ style: { id: string } }>('view.info', { viewId: c.viewId });
    c.ai.call('style.setRoomStamp', {
      styleId: view.style.id,
      fields: ['number', 'category', 'area', 'occupants'],
    });
    expect(() => c.ai.call('style.setRoomStamp', { styleId: view.style.id, fields: ['barva'] })).toThrow();
    c.ai.call('room.update', { roomId: id, categoryId: living, color: null, occupants: null });
    const after = must(c.ai.call<(RoomRow & Record<string, unknown>)[]>('room.list')[0]);
    expect([after['color'], after['props']]).toEqual([
      null,
      { floorFinish: 'keramická dlažba', temperature: 22, note: 'vymyšlená poznámka' },
    ]);
  });
});
