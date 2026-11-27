import { describe, expect, it } from 'vitest';
import { vec } from '../geometry/index.ts';
import { parseProject, serializeProject } from '../persistence/project-file.ts';
import { slabArea } from '../slab/geometry.ts';
import { getSlab } from '../slab/queries.ts';
import { fixture, type Fixture } from '../testing/fixture.ts';

const typeNamed = (f: Fixture, name: string) =>
  Object.values(f.model.slabTypes).find((t) => t.name === name)!.id;

/** Byt 4 × 3 m, příčka 100 v ose x = 2000, v ní otvor 900 k podlaze; v obou místnostech podlaha. */
function setup() {
  const f = fixture();
  const walls = f.run('wall.rectangle', {
    storeyId: f.storeyId,
    typeId: f.type('Zdivo 300'),
    a: vec(0, 0),
    b: vec(4000, 3000),
  });
  const p = f.line(vec(2000, 0), vec(2000, 3000), { typeId: f.type('Příčka 100'), referenceLine: 'axis' });
  const [door] = f.run('opening.create', { wallId: p, offset: 1000, width: 900, height: 2100, sill: 0 });
  const floor = (x: number) => {
    const [roomId] = f.run('room.create', { storeyId: f.storeyId, point: vec(x, 1500) });
    return f.run('slab.create', {
      storeyId: f.storeyId,
      typeId: typeNamed(f, 'Podlaha anhydrit 150'),
      roomId,
    })[0]!;
  };
  return { f, walls, p, door: door!, a: floor(1000), b: floor(3000) };
}
const m2 = (f: Fixture, id: string) => slabArea(getSlab(f.model, id)) / 1e6;
const ROOM = 1.95 * 3;

describe('podlaha v otvoru: podlaha vede pod otvorem dveří (základ 14, ČSN 73 4301)', () => {
  it('podlaha v otvoru 1: otvor 900 v příčce 100 → dvě podlahy, každá o 900 × 50 větší', () => {
    const { f, a, b } = setup();
    expect(m2(f, a)).toBeCloseTo(ROOM + 0.045, 6);
    expect(m2(f, b)).toBeCloseTo(ROOM + 0.045, 6);
  });

  it('podlaha v otvoru 4: plocha místnosti podle ČSN zůstane bez otvoru', () => {
    const { f } = setup();
    const rooms = f.editor.query('room.list', {});
    const areas = (rooms.ok ? (rooms.data as { area: number }[]) : []).map((r) => r.area);
    expect(areas).toEqual([5.85, 5.85]);
  });

  it('podlaha v otvoru 3: celá z A / celá z B / žádná – příkaz, Undo', () => {
    const { f, door, a, b } = setup();
    const sideOfA = f.wall(f.model.openings[door]!.hostId).path.start.y === 0 ? 'opp' : 'ref';
    f.run('opening.setFloorSplit', { openingIds: [door], split: sideOfA });
    expect([m2(f, a), m2(f, b)].map((v) => Math.round(v * 1e4) / 1e4)).toEqual([5.94, 5.85]);
    f.run('opening.setFloorSplit', { openingIds: [door], split: 'none' });
    expect(m2(f, a)).toBeCloseTo(ROOM, 6);
    f.editor.undo();
    expect(m2(f, a)).toBeCloseTo(ROOM + 0.09, 6);
  });

  it('podlaha v otvoru 2: vstupní dveře bez místnosti venku – podlaha do osy stěny', () => {
    const { f, walls, a } = setup();
    const left = walls.find((w) => f.wall(w).path.start.x === 0 && f.wall(w).path.end.x === 0)!;
    f.run('opening.create', { wallId: left, offset: 1000, width: 1000, height: 2100, sill: 0 });
    expect(m2(f, a)).toBeCloseTo(ROOM + 0.045 + 0.15, 6);
  });

  it('podlaha v otvoru: okno s parapetem podlahu nemění', () => {
    const { f, walls, a } = setup();
    const left = walls.find((w) => f.wall(w).path.start.x === 0 && f.wall(w).path.end.x === 0)!;
    f.run('opening.create', { wallId: left, offset: 1000, width: 1000, height: 1200, sill: 900 });
    expect(m2(f, a)).toBeCloseTo(ROOM + 0.045, 6);
  });

  it('podlaha v otvoru 5: posun otvoru i příčky proužek přepočítá', () => {
    const { f, p, door, a } = setup();
    f.run('opening.update', { openingIds: [door], width: 1000 });
    expect(m2(f, a)).toBeCloseTo(ROOM + 0.05, 6);
    f.run('wall.move', { wallIds: [p], vector: vec(-500, 0) });
    expect(m2(f, a)).toBeCloseTo(1.45 * 3 + 0.05, 6);
  });

  it('podlaha v otvoru 4: povrch podlahy místnosti proužek započítá; volba přežije uložení (migrace 29 → 30)', () => {
    const { f, door } = setup();
    f.run('opening.setFloorSplit', { openingIds: [door], split: 'none' });
    const r = parseProject(serializeProject(f.model));
    expect(r.ok && r.model.openings[door]?.floorSplit).toBe('none');
    f.run('opening.setFloorSplit', { openingIds: [door], split: 'split' });
    const q = f.editor.query('covering.surfaces', { storeyId: f.storeyId });
    const floors = (q.ok ? (q.data as { place: string; area: number }[]) : []).filter(
      (s) => s.place === 'floor',
    );
    expect(floors.map((s) => s.area)).toEqual([5.9, 5.9]);
  });
});
