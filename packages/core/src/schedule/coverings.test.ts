import { describe, expect, it } from 'vitest';
import { vec } from '../geometry/index.ts';
import { fixture, type Fixture } from '../testing/fixture.ts';
import { wallSection } from '../wall/queries.ts';
import { computeSchedule } from './compute.ts';

const setup = () => {
  const f = fixture();
  const [top] = f.run('wall.rectangle', {
    storeyId: f.storeyId,
    typeId: f.type('Zdivo 300'),
    a: vec(0, 0),
    b: vec(4000, 3000),
  });
  const id = f.run('room.create', { storeyId: f.storeyId, point: vec(2000, 1500), name: 'Koupelna' })[0]!;
  f.run('covering.assign', { roomId: id, place: 'walls', typeId: 'cov-paint-white' });
  f.run('covering.assign', { roomId: id, place: 'floor', typeId: 'cov-floor-tiles-600' });
  f.run('opening.create', { wallId: top, offset: 300, width: 1000, height: 1500, sill: 900 });
  f.run('opening.create', { wallId: top, offset: 1600, width: 2000, height: 2100, sill: 0 });
  const half = wallSection(f.model, f.model.elements[top!] as never).thickness / 2;
  return { f, half };
};

const wallsRow = (f: Fixture, patch: Record<string, unknown> = {}) => {
  const fields = ['place', 'type', 'area', 'openingArea', 'jambArea'];
  const def = { ...f.model.schedules['schedule-coverings']!, groupBy: ['place'], fields, ...patch };
  const t = computeSchedule(f.model, def);
  return t.rows.find((r) => r.kind === 'item' && r.cells['place'] === 'Stěny')!.cells;
};

describe('prvky stavby 9: výkaz povrchů (základ 8)', () => {
  it('prvky stavby 9: výchozí pravidlo – otvory do 4 m² se neodečítají a jejich ostění se nepřičítá', () => {
    const { f, half } = setup();
    const jambs = (2 * 2100 * half + 2000 * half) / 1e6;
    const c = wallsRow(f);
    expect(c['openingArea']).toBe(4.2);
    expect(c['jambArea']).toBeCloseTo(jambs, 1);
    expect(c['area']).toBeCloseTo(42 - 4.2 + jambs, 1);
  });

  it('prvky stavby 9: pravidlo nastavitelné – odečíst vše a ostění vždy, nebo ostění nikdy', () => {
    const { f, half } = setup();
    const all = wallsRow(f, { minOpeningArea: 0, jambRule: 'all' });
    expect(all['openingArea']).toBe(5.7);
    const jambs = 2 * 2100 * half + 2000 * half + 2 * 1500 * half + 2 * 1000 * half;
    expect(all['jambArea']).toBeCloseTo(jambs / 1e6, 1);
    const none = wallsRow(f, { jambRule: 'none' });
    expect(none['jambArea']).toBe(0);
    expect(none['area']).toBe(37.8);
  });

  it('prvky stavby 9 / podlaha v otvoru: podlaha = plocha místnosti + proužek ve dveřích do osy stěny', () => {
    const { f, half } = setup();
    const t = computeSchedule(f.model, f.model.schedules['schedule-coverings']!);
    const floor = t.rows.find((r) => r.kind === 'item' && r.cells['type'] === 'Dlažba 600×600 šedá');
    expect(floor?.cells['area']).toBeCloseTo(12 + (2000 * half) / 1e6, 6);
    expect(floor?.cells['room']).toBe('1.01 Koupelna');
  });
});
