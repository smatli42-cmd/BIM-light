import { describe, expect, it } from 'vitest';
import { vec } from '../geometry/index.ts';
import { parseProject, serializeProject } from '../persistence/project-file.ts';
import { computeSchedule } from '../schedule/compute.ts';
import { SLABS_SCHEDULE } from '../schedule/defaults.ts';
import { fixture, type Fixture } from '../testing/fixture.ts';
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
const partition = (f: Fixture) =>
  f.line(vec(2000, 0), vec(2000, 3000), { typeId: f.type('Příčka 100'), referenceLine: 'axis' });
const floorIn = (f: Fixture, x: number, y = 1500) => {
  const [roomId] = f.run('room.create', { storeyId: f.storeyId, point: vec(x, y) });
  return f.run('slab.create', {
    storeyId: f.storeyId,
    typeId: typeNamed(f, 'Podlaha anhydrit 150'),
    roomId,
  })[0]!;
};
const linear = (f: Fixture, refs: unknown[]) =>
  f.run('dimension.create', { kind: 'linear', refs, viewId: f.viewId })[0] as string;
const edge = (ownerId: string, e: number) => ({ outline: 'slab', ownerId, edge: e });

describe('desky – vazba 5: kóty k hraně vázané desky', () => {
  it('desky – vazba 3: změna čísla kóty k hraně podlahy posune desku a vazbu zamkne', () => {
    const f = fixture();
    const walls = rect(f);
    const s = floorIn(f, 2000);
    const left = walls.find((w) => f.wall(w).path.start.x === 0 && f.wall(w).path.end.x === 0)!;
    const e = getSlab(f.model, s).outline.findIndex(
      (p, i, o) => p.x > 3999 && o[(i + 1) % o.length]!.x > 3999,
    );
    const d = linear(f, [{ wallId: left, face: 'ref' }, edge(s, e)]);
    f.run('dimension.setValue', { dimensionId: d, value: 3500, moveRef: 1 });
    expect(getSlab(f.model, s).link?.locked).toBe(true);
  });

  it('desky – vazba 5: příčka změní počet bodů obrysu podlahy → kóta k zaniklé hraně se smaže', () => {
    const f = fixture();
    rect(f);
    const s = floorIn(f, 1000, 500);
    const a = linear(f, [edge(s, 0), edge(s, 2)]);
    f.line(vec(0, 1500), vec(1500, 1500), { typeId: f.type('Příčka 100'), referenceLine: 'axis' });
    expect(getSlab(f.model, s).outline.length).toBeGreaterThan(4);
    expect(f.model.dimensions[a]).toBeUndefined();
  });
});

describe('desky – vazba 4: výkaz podlahy (Revit: stěna podlahu prořízne)', () => {
  const rowOf = (f: Fixture) =>
    computeSchedule(f.model, f.model.schedules[SLABS_SCHEDULE.id]!).rows.find(
      (r) => r.kind === 'item' && r.cells['mark'] === 'P1',
    )!.cells;

  it('desky – vazba 4: ruční podlaha přes dvě místnosti – výkaz odečte příčku (plocha i objem)', () => {
    const f = fixture();
    rect(f);
    partition(f);
    const r = { a: vec(0, 0), b: vec(4000, 3000) };
    f.run('slab.create', { storeyId: f.storeyId, typeId: typeNamed(f, 'Podlaha anhydrit 150'), rect: r });
    const row = rowOf(f);
    expect(row['area']).toBeCloseTo(12 - 0.3, 6);
    expect(row['volume']).toBeCloseTo((12 - 0.3) * 0.15, 6);
  });

  it('desky – vazba 4: podlaha vázaná na místnost vede od líce k líci (nic se neodečítá)', () => {
    const f = fixture();
    rect(f);
    partition(f);
    floorIn(f, 1000);
    expect(rowOf(f)['area']).toBeCloseTo(5.85, 6);
  });
});

describe('základ 9: migrace 28 → 29 (vazba desky)', () => {
  it('základ 9: vazba a ostrovy přežijí uložení a otevření; starší desky zůstanou ruční', () => {
    const f = fixture();
    rect(f);
    const s = floorIn(f, 2000);
    const r = parseProject(serializeProject(f.model));
    expect(r.ok && getSlab(r.model, s).link?.kind).toBe('room');
  });
});
