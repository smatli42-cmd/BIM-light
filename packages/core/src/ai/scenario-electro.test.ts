// AI scénář elektra (koncepce 3): z knihovny typů vybrat zásuvky, spínač, svítidla a rozvaděč, rozmístit
// je na stěny a strop místnosti, upravit výšku a rámeček, posunout stěnu – jen JSON voláními nástrojů.
import { describe, expect, it } from 'vitest';
import { must, room, start } from './scenario-helpers.ts';

interface TypeRow {
  id: string;
  name: string;
  defaultHeight: number | null;
  ifcClass: string;
  groupName: string;
  used: number;
}
interface Row {
  id: string;
  typeName: string;
  mark: string;
  height: number | null;
  heightLabel: string | null;
  roomNumber: string | null;
  position: { x: number; y: number } | null;
  slots: string[];
}

describe('AI scénář: elektro značky', () => {
  it('rozmístění z knihovny, místnost automaticky, popisek výšky jen při odlišné výšce, pohyb se stěnou', () => {
    const c = start();
    const [left, , right] = room(c);
    c.ai.call('room.create', { storeyId: c.storeyId, point: { x: 3000, y: 2000 }, name: 'Kuchyně' });
    const types = c.ai.call<TypeRow[]>('electroType.list');
    const type = (name: string) => must(types.find((t) => t.name === name));
    expect(type('Dvojzásuvka')).toMatchObject({
      defaultHeight: 300,
      ifcClass: 'IfcOutlet',
      groupName: 'Silnoproud',
    });

    const put = (name: string, args: Record<string, unknown>) =>
      must(c.ai.call<string[]>('electro.create', { typeId: type(name).id, ...args })[0]);
    // Na stěnu bodem uvnitř místnosti: bod se promítne na vnitřní líc.
    const z1 = put('Dvojzásuvka', { wallId: left, point: { x: 100, y: 1000 }, height: 1150, mark: 'Z1' });
    put('Spínač č. 1', { wallId: left, point: { x: 100, y: 3500 }, mark: 'S1' });
    put('Svítidlo stropní', { storeyId: c.storeyId, point: { x: 3000, y: 2000 }, mark: 'S1' });
    const frame = put('Zásuvka', { wallId: right, point: { x: 5900, y: 2000 }, mark: 'Z2, D1, T1' });
    c.ai.call('electro.update', { elementId: frame, slots: ['socket', 'socket', 'data', 'tv'] });
    put('Rozvaděč hlavní (RH)', { wallId: right, point: { x: 5900, y: 3200 }, mark: 'RH' });

    const list = () => c.ai.call<Row[]>('electro.list', { storeyId: c.storeyId });
    const row = (id: string) => must(list().find((r) => r.id === id));
    expect(list().every((r) => r.roomNumber === '1.01')).toBe(true);
    expect(row(z1)).toMatchObject({ height: 1150, heightLabel: '+1150', position: { x: 0, y: 1000 } });
    expect(list().find((r) => r.typeName === 'Spínač č. 1')).toMatchObject({
      height: 1050,
      heightLabel: null,
    });
    expect(list().find((r) => r.typeName === 'Svítidlo stropní')).toMatchObject({
      height: null,
      heightLabel: null,
    });
    expect(row(frame).slots).toEqual(['socket', 'socket', 'data', 'tv']);
    expect(must(c.ai.call<TypeRow[]>('electroType.list').find((t) => t.name === 'Zásuvka')).used).toBe(1);

    // Levá stěna o 500 mm doleva: zásuvka jde se stěnou, místnost se přepočítá.
    c.ai.call('wall.move', { wallIds: [must(left)], vector: { x: -500, y: 0 } });
    expect(row(z1).position).toEqual({ x: -500, y: 1000 });
    expect(row(z1).roomNumber).toBe('1.01');

    // Výška zpět na výchozí: popisek výšky zmizí.
    c.ai.call('electro.update', { elementId: z1, height: null });
    expect(row(z1)).toMatchObject({ height: 300, heightLabel: null });
  });
});
