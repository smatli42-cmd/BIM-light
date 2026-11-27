import { describe, expect, it } from 'vitest';
import { SCHEMA_VERSION } from '../model/types.ts';
import { parseProject, serializeProject } from '../persistence/project-file.ts';
import { fixture, type Fixture } from '../testing/fixture.ts';
import { computeSchedule } from './compute.ts';
import { SLABS_SCHEDULE } from './defaults.ts';

const typeId = (f: Fixture, name: string) =>
  Object.values(f.model.slabTypes).find((t) => t.name === name)!.id;

/** Strop 6 × 4 m (ŽB 250 = 260 mm) s otvorem 1 × 2 m a podlaha 6 × 4 m. */
function project() {
  const f = fixture();
  const rect = { a: { x: 0, y: 0 }, b: { x: 6000, y: 4000 } };
  f.run('slab.create', { storeyId: f.storeyId, typeId: typeId(f, 'ŽB strop 250'), rect });
  f.run('slab.create', { storeyId: f.storeyId, typeId: typeId(f, 'Podlaha anhydrit 150'), rect });
  f.run('slabOpening.create', {
    storeyId: f.storeyId,
    rect: { a: { x: 1000, y: 1000 }, b: { x: 2000, y: 3000 } },
  });
  return f;
}

describe('desky D4 / základ 8: výkaz desek obecným mechanismem tabulek', () => {
  it('desky D4: nový projekt má „Výkaz desek“; sloupce typ, značka, podlaží, plochy, obvod, tloušťka, objem', () => {
    const f = project();
    const def = f.model.schedules[SLABS_SCHEDULE.id]!;
    expect(def.name).toBe('Výkaz desek');
    const t = computeSchedule(f.model, def);
    expect(t.columns.map((c) => c.key)).toEqual(SLABS_SCHEDULE.fields);
    const rc = t.rows.find((r) => r.kind === 'item' && r.cells['mark'] === 'D1')!.cells;
    expect(rc).toMatchObject({ type: 'ŽB strop 250', storey: '1.NP', thickness: 260, count: 1 });
    expect([rc['area'], rc['netArea'], rc['perimeter'], rc['volume']]).toEqual([24, 22, 20, 5.72]);
  });

  it('desky D4: součet celkem sčítá plochy a objem; tloušťka se nesčítá', () => {
    const f = project();
    const t = computeSchedule(f.model, f.model.schedules[SLABS_SCHEDULE.id]!);
    const total = t.rows.find((r) => r.kind === 'total')!.cells;
    expect(total).toMatchObject({ count: 2, area: 48, netArea: 44, volume: 5.72 + 3.3 });
    expect(total['thickness']).toBeUndefined();
  });

  it('desky D4: výkaz se přepočítá po změně desky (typ = jiná tloušťka)', () => {
    const f = project();
    const slab = Object.values(f.model.elements).find(
      (e) => e.category === 'slab' && e.typeId === typeId(f, 'ŽB strop 250'),
    )!;
    f.run('slab.update', { slabIds: [slab.id], typeId: typeId(f, 'ŽB základová deska 300') });
    const t = computeSchedule(f.model, f.model.schedules[SLABS_SCHEDULE.id]!);
    expect(t.rows.find((r) => r.kind === 'item' && r.cells['mark'] === 'D2')?.cells['volume']).toBe(9.9);
  });

  it('desky D4 / Z8: mez odečtu otvorů platí pro plochu bez otvorů, objem odečte vždy všechny', () => {
    const f = project();
    f.run('schedule.update', { scheduleId: SLABS_SCHEDULE.id, minOpeningArea: 2 });
    const t = computeSchedule(f.model, f.model.schedules[SLABS_SCHEDULE.id]!);
    const rc = t.rows.find((r) => r.kind === 'item' && r.cells['mark'] === 'D1')!.cells;
    expect([rc['netArea'], rc['volume']]).toEqual([24, 5.72]);
  });

  it('desky D4 / základ 9: migrace 21 → 22 přidá výkaz desek, vlastní výkazy zůstanou', () => {
    const f = fixture();
    const old = JSON.parse(serializeProject(f.model)) as Record<string, unknown> & {
      schedules: Record<string, unknown>;
    };
    delete old.schedules['schedule-slabs'];
    const r = parseProject(JSON.stringify({ ...old, schemaVersion: 21 }));
    if (!r.ok) throw new Error(r.error);
    expect(r.model.schemaVersion).toBe(SCHEMA_VERSION);
    expect(Object.values(r.model.schedules).map((s) => s.name)).toContain('Výkaz desek');
    expect(Object.keys(r.model.schedules)).toHaveLength(Object.keys(old.schedules).length + 1);
  });

  it('desky D4: AI vidí zdroj „slabs“ v schedule.fields a může založit vlastní výkaz desek', () => {
    const f = project();
    const [id] = f.run('schedule.create', {
      name: 'Desky po podlažích',
      source: 'slabs',
      fields: ['storey', 'netArea'],
    });
    const t = computeSchedule(f.model, f.model.schedules[id as string]!);
    expect(t.columns.map((c) => c.label)).toEqual(['Podlaží', 'Plocha bez otvorů']);
  });
});
