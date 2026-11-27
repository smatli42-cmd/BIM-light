import { describe, expect, it } from 'vitest';
import { vec } from '../geometry/index.ts';
import { computeSchedule } from '../schedule/compute.ts';
import { fixture, type Fixture } from '../testing/fixture.ts';
import { drawView } from '../view/draw-view.ts';
import { roomTiling, withWaste } from './tiles.ts';

/** Místnost 4000 × 3000 (vnitřní líce) s dlažbou 600 × 600 bez spáry na střed. */
function bath(f: Fixture) {
  const walls = f.run('wall.rectangle', {
    storeyId: f.storeyId,
    typeId: f.type('Zdivo 300'),
    a: vec(0, 0),
    b: vec(4000, 3000),
  });
  const [roomId] = f.run('room.create', { storeyId: f.storeyId, point: vec(2000, 1500) });
  const [typeId] = f.run('coveringType.create', {
    name: 'Dlažba 600',
    kind: 'floor-tiles',
    tile: { width: 600, height: 600, joint: 0, align: 'center' },
  });
  f.run('covering.assign', { roomId, place: 'floor', typeId });
  return { walls, roomId: roomId!, typeId: typeId! };
}
const floor = (f: Fixture, roomId: string) =>
  roomTiling(f.model, f.model.rooms[roomId]!).find((t) => t.surface.place === 'floor')!;

describe('prvky stavby 9: spárořez ploch místnosti', () => {
  it('prvky stavby 9: dlažba na střed – 5 celých v řadě, odřezy 500 mm po stranách', () => {
    const f = fixture();
    const { roomId } = bath(f);
    const t = floor(f, roomId).layout;
    expect([t.whole, t.cut, t.narrow]).toEqual([25, 10, 0]);
  });

  it('prvky stavby 9 / základ 14: covering.setOrigin posune počátek, úzké řezy se ohlásí', () => {
    const f = fixture();
    const { roomId } = bath(f);
    f.run('covering.setOrigin', { roomId, place: 'floor', offset: { x: 300, y: 0 } });
    expect(f.model.rooms[roomId]!.coverings?.tileOrigins).toEqual({ floor: { x: 300, y: 0 } });
    expect([floor(f, roomId).layout.whole, floor(f, roomId).layout.cut]).toEqual([30, 10]);
    f.run('covering.setOrigin', { roomId, place: 'floor', offset: { x: 350, y: 0 } });
    expect(floor(f, roomId).layout.narrow).toBe(5);
    f.run('covering.setOrigin', { roomId, place: 'floor', offset: null });
    expect(f.model.rooms[roomId]!.coverings?.tileOrigins).toEqual({});
  });

  it('základ 14: posun stěny spárořez přepočítá, posun počátku zůstane', () => {
    const f = fixture();
    const { roomId, walls } = bath(f);
    f.run('covering.setOrigin', { roomId, place: 'floor', offset: { x: 100, y: 0 } });
    f.run('wall.move', { wallIds: [walls[1]], vector: vec(600, 0) });
    const t = floor(f, roomId);
    expect(t.offset).toEqual({ x: 100, y: 0 });
    expect(t.layout.anchor.x - t.layout.origin.x).toBe(-100);
    expect(t.layout.whole + t.layout.cut).toBe(45);
  });

  it('prvky stavby 9: obklad stěny – spáry se v otvoru přeruší, kusy kolem jsou odřezy', () => {
    const f = fixture();
    const { roomId, walls } = bath(f);
    f.run('covering.setZones', { roomId, zones: [{ typeId: 'cov-tiling-300x600', top: 1500 }] });
    const before = roomTiling(f.model, f.model.rooms[roomId]!).filter((t) => t.surface.wallId === walls[3]);
    f.run('opening.create', { wallId: walls[3], offset: 1000, width: 1000, height: 1500, sill: 900 });
    const after = roomTiling(f.model, f.model.rooms[roomId]!).filter((t) => t.surface.wallId === walls[3]);
    expect(before).toHaveLength(1);
    expect(after[0]!.layout.whole).toBeLessThan(before[0]!.layout.whole);
    const cutJoints = after[0]!.layout.joints.filter((j) => j.a.y > 899 && j.a.y < 1501 && j.b.y > 1501);
    expect(cutJoints).toHaveLength(0);
  });

  it('prvky stavby 9: spárořez v půdorysu jen ve stylu Projekt, vypínatelný ve stylu', () => {
    const f = fixture();
    const { roomId } = bath(f);
    const joints = () => drawView(f.model, f.viewId).primitives.filter((p) => p.source.role === 'spárořez');
    const styleId = f.model.views[f.viewId]!.styleId;
    f.run('view.setStyle', { viewId: f.viewId, styleId: f.style('Projekt') });
    expect(joints().length).toBe(floor(f, roomId).layout.joints.length);
    const line = joints()[0]!;
    expect(line.kind === 'line' && line.stroke.pen).toBe(1);
    f.run('style.setTileJoints', { styleId: f.style('Projekt'), visible: false });
    expect(joints()).toHaveLength(0);
    f.run('view.setStyle', { viewId: f.viewId, styleId: f.style('Studie') });
    expect(joints()).toHaveLength(0);
    f.run('style.setTileJoints', { styleId: f.style('Studie'), visible: true });
    expect(joints().length).toBeGreaterThan(0);
    expect(styleId).toBeTruthy();
  });

  it('prvky stavby 9 / základ 8: Výkaz dlaždic – celé, řezané a celkem s prořezem', () => {
    const f = fixture();
    bath(f);
    expect(withWaste(35, 10)).toBe(39);
    const table = () => computeSchedule(f.model, f.model.schedules['schedule-tiles']!);
    const row = () => table().rows.find((r) => r.kind === 'item')!.cells;
    expect(row()).toMatchObject({ type: 'Dlažba 600', whole: 25, cut: 10, total: 35, totalWithWaste: 39 });
    f.run('schedule.update', { scheduleId: 'schedule-tiles', wastePercent: 0 });
    expect(row()['totalWithWaste']).toBe(35);
  });
});
