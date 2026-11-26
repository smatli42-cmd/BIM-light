import { describe, expect, it } from 'vitest';
import { vec } from '../geometry/index.ts';
import { fixture, room } from '../testing/fixture.ts';
import { computeSchedule, type ScheduleTable } from './compute.ts';
import { scheduleToCsv } from './csv.ts';

type F = ReturnType<typeof fixture>;
const table = (f: F, id: string): ScheduleTable => computeSchedule(f.model, f.model.schedules[id]!);
const items = (t: ScheduleTable) => t.rows.filter((r) => r.kind === 'item').map((r) => r.cells);
const total = (t: ScheduleTable) => t.rows.find((r) => r.kind === 'total')?.cells;

/** Jedna volná stěna Zdivo 300, 4 m × 3 m, s oknem 1200 × 1500. */
function oneWall() {
  const f = fixture();
  const w = f.line(vec(0, 0), vec(4000, 0));
  f.run('opening.create', { wallId: w, offset: 1000, width: 1200, height: 1500, sill: 900 });
  return { f, w };
}

describe('plan-steny / Z8: výkaz stěn (ruční přepočet)', () => {
  it('plan-steny / Z8: stěna 4 × 3 m s oknem 1,2 × 1,5 m: délka, plochy a objem', () => {
    const { f } = oneWall();
    const [row] = items(table(f, 'schedule-walls'));
    // 4 × 3 = 12 m²; okno 1,8 m²; objem 4 × 0,3 × 3 − 1,2 × 1,5 × 0,3 = 3,6 − 0,54 = 3,06 m³
    expect(row).toMatchObject({
      mark: 'S1',
      type: 'Zdivo 300',
      count: 1,
      length: 4,
      grossArea: 12,
      openingArea: 1.8,
      netArea: 10.2,
      volume: 3.06,
    });
  });

  it('plan-steny / Z8: místnost 4 × 3 m (vnitřní líc), zdivo 300 ven: osa 15,2 m, objem 13,68 m³', () => {
    const f = fixture();
    room(f);
    const [row] = items(table(f, 'schedule-walls'));
    // osa 4,3 × 3,3 m → 2 × (4,3 + 3,3) = 15,2 m; objem (4,6 × 3,6 − 4 × 3) × 3 = 13,68 m³
    expect(row).toMatchObject({ count: 4, length: 15.2, volume: 13.68 });
  });

  it('sekce 9 / plan-steny Z8: malý otvor do meze se z plochy neodečte, z objemu ano', () => {
    const f = fixture();
    const w = f.line(vec(0, 0), vec(4000, 0));
    f.run('opening.create', { wallId: w, offset: 1000, width: 500, height: 400, sill: 900 });
    f.run('schedule.update', { scheduleId: 'schedule-walls', minOpeningArea: 0.25 });
    const [row] = items(table(f, 'schedule-walls'));
    expect(row).toMatchObject({ openingArea: 0, netArea: 12, volume: 3.54 });
  });

  it('plan-steny / Z8: seskupení podle typu, stav jako filtr, celkový součet', () => {
    const f = fixture();
    f.line(vec(0, 0), vec(4000, 0));
    f.line(vec(0, 3000), vec(2000, 3000));
    f.line(vec(0, 6000), vec(3000, 6000), { typeId: f.type('Příčka 125'), status: 'existing' });
    const t = table(f, 'schedule-walls');
    expect(items(t).map((r) => [r.mark, r.count, r.length])).toEqual([
      ['S1', 2, 6],
      ['S2', 1, 3],
    ]);
    expect(total(t)).toMatchObject({ count: 3, length: 9 });
    f.run('schedule.update', { scheduleId: 'schedule-walls', filter: { statuses: ['existing'] } });
    expect(total(table(f, 'schedule-walls'))).toMatchObject({ count: 1, length: 3 });
  });

  it('plan-steny / Z8: po prvcích se záhlavím skupiny a mezisoučtem', () => {
    const f = fixture();
    f.line(vec(0, 0), vec(4000, 0));
    f.line(vec(0, 3000), vec(2000, 3000));
    f.run('schedule.update', { scheduleId: 'schedule-walls', itemize: true, sortBy: 'length' });
    const kinds = table(f, 'schedule-walls').rows.map((r) => r.kind);
    expect(kinds).toEqual(['group', 'item', 'item', 'subtotal', 'total']);
    expect(items(table(f, 'schedule-walls')).map((r) => r.length)).toEqual([2, 4]);
  });
});

describe('plan-steny / Z8: výkaz materiálů a legenda skladeb', () => {
  it('plan-steny / Z8: zateplená stěna 4 × 3 m: objem omítky, zdiva a EPS', () => {
    const f = fixture();
    f.line(vec(0, 0), vec(4000, 0), { typeId: f.type('Obvodová zateplená 465') });
    const rows = items(table(f, 'schedule-materials'));
    const vol = Object.fromEntries(rows.map((r) => [r.material, r.volume]));
    // Omítka u volných konců obalí čela (Z2), zdivo je o 2 × 15 mm kratší: 3,97 × 0,3 × 3 = 3,573 m³
    expect(vol['Zdivo keramické']).toBe(3.573);
    // Celek = 4 × 0,465 × 3 = 5,58 m³ (vrstvy se nepřekrývají)
    expect(items(table(f, 'schedule-walls'))[0]?.volume).toBe(5.58);
  });

  it('plan-steny / Z8: legenda – jen použité typy se značkou a skladbou', () => {
    const f = fixture();
    f.line(vec(0, 0), vec(4000, 0), { typeId: f.type('Obvodová zateplená 465') });
    const rows = items(table(f, 'schedule-legend'));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ mark: 'S3', thickness: 465, function: 'Obvodová', loadBearing: true });
    expect(String(rows[0]?.composition)).toMatch(/15 \+ .* 300 \+ .* 150$/);
  });

  it('plan-steny / Z8: značka typu – nový typ dostane volnou, obsazenou nastavit nejde', () => {
    const f = fixture();
    const [id] = f.run('wallType.duplicate', { typeId: f.type('Zdivo 300') });
    expect(f.model.wallTypes[id!]?.mark).toBe('S9');
    expect(f.editor.execute('wallType.setMark', { typeId: id, mark: 'S1' }).ok).toBe(false);
    f.run('wallType.setMark', { typeId: id, mark: 'S10a' });
    expect(f.model.wallTypes[id!]?.mark).toBe('S10a');
  });
});

describe('základ 8: obecný mechanismus tabulek', () => {
  it('základ 8: nový výkaz z libovolných polí zdroje; neznámé pole neprojde', () => {
    const { f } = oneWall();
    const [id] = f.run('schedule.create', {
      name: 'Plochy podle podlaží',
      source: 'walls',
      fields: ['storey', 'netArea'],
      groupBy: ['storey'],
      itemize: false,
    });
    expect(items(table(f, id!))).toEqual([{ storey: '1.NP', netArea: 10.2 }]);
    const bad = f.editor.execute('schedule.create', { name: 'X', source: 'walls', fields: ['barva'] });
    expect(bad.ok).toBe(false);
    f.run('schedule.delete', { scheduleId: id });
    expect(f.model.schedules[id!]).toBeUndefined();
  });

  it('základ 8: CSV se středníkem a desetinnou čárkou, záhlaví s jednotkou', () => {
    const { f } = oneWall();
    const csv = scheduleToCsv(table(f, 'schedule-walls'));
    const [head, first, last] = csv.trim().split('\r\n');
    expect(head).toBe(
      'Značka;Typ;Tloušťka (mm);Počet (ks);Délka (m);Plocha hrubá (m²);Otvory (m²);Plocha čistá (m²);Objem (m³)',
    );
    expect(first).toBe('S1;Zdivo 300;300;1;4,00;12,00;1,80;10,20;3,060');
    expect(last).toMatch(/^Celkem;/);
  });
});
