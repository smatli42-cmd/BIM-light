// AI scénář povrchy místností (prvky stavby 9, základ 14): typ úpravy, zóny místnosti, přepis jedné
// stěny, podlaha a strop, plochy pro 3D (covering.surfaces), povrchy místnosti a výkaz – jen JSON voláními.
import { describe, expect, it } from 'vitest';
import { must, room, start } from './scenario-helpers.ts';

interface TypeRow {
  id: string;
  name: string;
  kind: string;
  materialId: string | null;
  used: number;
}
interface SurfaceRow {
  place: string;
  wallId?: string;
  typeId: string | null;
  color: string | null;
  area: number;
  frame: { kind: string };
  polygons: { outer: { x: number; y: number }[] }[];
}
interface RoomCoveringsRow {
  faces: { wallId: string; side: string; length: number; override: unknown }[];
  totals: { walls: { typeName: string | null; area: number }[] };
}
interface Table {
  rows: { kind: string; cells: Record<string, unknown> }[];
}

describe('AI scénář: povrchy místností', () => {
  it('obklad do 1500 a malba, jiná stěna jinak, dlažba a podhled, plochy pro 3D a výkaz', () => {
    const c = start();
    const walls = room(c);
    const [roomId] = c.ai.call<string[]>('room.create', {
      storeyId: c.storeyId,
      point: { x: 3000, y: 2000 },
      name: 'Koupelna',
    });
    const types = c.ai.call<TypeRow[]>('coveringType.list');
    const tiles = must(types.find((t) => t.kind === 'tiling')).id;
    const paint = must(types.find((t) => t.name === 'Malba bílá')).id;
    const floor = must(types.find((t) => t.kind === 'floor-tiles')).id;
    const ceiling = must(types.find((t) => t.kind === 'ceiling')).id;
    const [blue] = c.ai.call<string[]>('coveringType.create', {
      name: 'Obklad 200×200 modrý',
      kind: 'tiling',
      tile: { width: 200, height: 200, joint: 2, align: 'center' },
    });

    c.ai.call('covering.setZones', {
      roomId,
      zones: [
        { typeId: tiles, top: 1500 },
        { typeId: paint, top: null },
      ],
    });
    c.ai.call('covering.assign', { roomId, place: 'floor', typeId: floor });
    c.ai.call('covering.assign', { roomId, place: 'ceiling', typeId: ceiling });
    const info = c.ai.call<RoomCoveringsRow>('covering.room', { roomId });
    expect(info.faces).toHaveLength(4);
    const face = must(info.faces.find((f) => f.wallId === walls[1]));
    c.ai.call('covering.setZones', {
      roomId,
      wallId: face.wallId,
      side: face.side,
      zones: [
        { typeId: blue, top: 2000 },
        { typeId: paint, top: null },
      ],
    });

    const surfaces = c.ai.call<SurfaceRow[]>('covering.surfaces', { storeyId: c.storeyId, viewId: c.viewId });
    const area = (typeId: string) =>
      Math.round(surfaces.filter((s) => s.typeId === typeId).reduce((a, s) => a + s.area, 0) * 100) / 100;
    // Stěny 6000 × 4000, výška 3000: horní stěna (6 m) má vlastní obklad do 2000.
    expect(area(must(blue))).toBe(12);
    expect(area(tiles)).toBe(14 * 1.5);
    expect(area(floor)).toBe(24);
    expect(must(surfaces.find((s) => s.typeId === floor)).color).toMatch(/^#/);
    expect(surfaces.every((s) => s.frame.kind === 'plane' && s.polygons[0]!.outer.length >= 3)).toBe(true);
    expect(c.ai.call<TypeRow[]>('coveringType.list').find((t) => t.id === blue)?.used).toBe(1);

    const defs = c.ai.call<{ id: string; source: string }[]>('schedule.list');
    const def = must(defs.find((d) => d.source === 'coverings'));
    const t = c.ai.call<Table>('schedule.table', { scheduleId: def.id });
    const rows = t.rows
      .filter((r) => r.kind === 'item')
      .map((r) => [r.cells['place'], r.cells['type'], r.cells['area']]);
    expect(rows).toContainEqual(['Podlaha', 'Dlažba 600×600 šedá', 24]);
    expect(rows).toContainEqual(['Stěny', 'Obklad 200×200 modrý', 12]);

    // Smazaný typ: plochy zůstanou, jen bez úpravy.
    c.ai.call('coveringType.delete', { typeId: blue });
    const after = c.ai.call<SurfaceRow[]>('covering.surfaces', { roomId });
    expect(after.filter((s) => s.typeId === null && s.place === 'wall').length).toBeGreaterThan(0);
  });
});
