// AI scénář spárořez (prvky stavby 9, základ 14): dlažba na podlaze, počty dlaždic, úzké řezy, posun
// počátku, spáry pro 3D, spárořez ve stylu a výkaz dlaždic s prořezem – jen JSON voláními.
import { describe, expect, it } from 'vitest';
import { must, room, start } from './scenario-helpers.ts';

interface TilesRow {
  roomId: string;
  types: {
    typeId: string;
    whole: number;
    cut: number;
    narrow: number;
    total: number;
    totalWithWaste: number;
  }[];
  surfaces: { place: string; originKey: string | null; anchor: { x: number }; origin: { x: number } }[];
}
interface JointsRow {
  surfaceId: string;
  place: string;
  joint: number;
  segments: { a: { x: number; y: number }; b: { x: number; y: number } }[];
  frame: { kind: string };
}
interface Table {
  rows: { kind: string; cells: Record<string, unknown> }[];
}

describe('AI scénář: spárořez', () => {
  it('dlažba 600 na střed, posun počátku, úzké řezy, spáry pro 3D a výkaz dlaždic', () => {
    const c = start();
    room(c);
    const [roomId] = c.ai.call<string[]>('room.create', {
      storeyId: c.storeyId,
      point: { x: 3000, y: 2000 },
      name: 'Koupelna',
    });
    const [typeId] = c.ai.call<string[]>('coveringType.create', {
      name: 'Dlažba 600 bez spáry',
      kind: 'floor-tiles',
      tile: { width: 600, height: 600, joint: 0, align: 'center' },
    });
    c.ai.call('covering.assign', { roomId, place: 'floor', typeId });

    const tiles = () => must(c.ai.call<TilesRow[]>('covering.tiles', { roomId })[0]);
    const counts = () => must(tiles().types[0]);
    // Podlaha 6000 × 4000 mínus polovina stěny (osa stěn) – stačí, že řezy jsou souměrné a nic není úzké.
    expect(counts().narrow).toBe(0);
    const whole = counts().whole;
    expect(counts().total).toBe(whole + counts().cut);
    expect(counts().totalWithWaste).toBe(Math.ceil(counts().total * 1.1));

    const surface = must(tiles().surfaces.find((s) => s.place === 'floor'));
    expect(surface.originKey).toBe('floor');
    expect(surface.origin.x).toBe(surface.anchor.x);
    c.ai.call('covering.setOrigin', { roomId, place: 'floor', offset: { x: 250, y: 0 } });
    expect(must(tiles().surfaces[0]).origin.x).toBe(surface.anchor.x + 250);
    expect(counts().narrow).toBeGreaterThan(0);

    const joints = c.ai.call<JointsRow[]>('covering.joints', { storeyId: c.storeyId });
    const fj = must(joints.find((j) => j.place === 'floor'));
    expect(fj.surfaceId).toBe(`${roomId}/floor`);
    expect(fj.frame.kind).toBe('plane');
    expect(fj.segments.length).toBeGreaterThan(5);

    const view = c.ai.call<{ style: { id: string } }>('view.info', { viewId: c.viewId });
    c.ai.call('style.setTileJoints', { styleId: view.style.id, visible: true });

    c.ai.call('schedule.update', { scheduleId: 'schedule-tiles', wastePercent: 0 });
    const t = c.ai.call<Table>('schedule.table', { scheduleId: 'schedule-tiles' });
    const item = must(t.rows.find((r) => r.kind === 'item')).cells;
    expect(item['totalWithWaste']).toBe(counts().total);
  });
});
