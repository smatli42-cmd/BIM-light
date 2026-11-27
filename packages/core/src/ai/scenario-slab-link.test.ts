// AI scénář: vazba obrysu desky – podlaha podle místnosti, nosná deska podle stěn, zámek po ruční úpravě
// a obnovení vazby, jen JSON voláními nástrojů (základy 6, 14, 16, 24).
import { describe, expect, it } from 'vitest';
import { must, room, start } from './scenario-helpers.ts';

interface SlabRow {
  id: string;
  area: number;
  outline: { x: number; y: number }[];
  link: { kind: string; roomId?: string; roomNumber?: string; wallIds?: string[]; locked: boolean } | null;
}

const maxX = (s: SlabRow) => Math.max(...s.outline.map((p) => p.x));

describe('AI scénář: vazba desky na místnost a stěny', () => {
  it('podlaha podle místnosti a deska podle stěn se po posunu stěny přepočítají; ruční úprava vazbu zamkne', () => {
    const c = start();
    const walls = room(c);
    const types = c.ai.call<{ id: string; name: string }[]>('slabType.list');
    const typeOf = (n: string) => must(types.find((t) => t.name === n)).id;
    const [roomId] = c.ai.call<string[]>('room.create', {
      storeyId: c.storeyId,
      point: { x: 3000, y: 2000 },
    });
    const [floor] = c.ai.call<string[]>('slab.create', {
      storeyId: c.storeyId,
      typeId: typeOf('Podlaha anhydrit 150'),
      roomId,
    });
    const [rc] = c.ai.call<string[]>('slab.create', {
      storeyId: c.storeyId,
      typeId: typeOf('ŽB strop 250'),
      walls: { wallIds: walls, boundary: 'face' },
    });
    const list = () => c.ai.call<SlabRow[]>('slab.list', { storeyId: c.storeyId });
    const get = (id?: string) => must(list().find((s) => s.id === id));
    expect(get(floor).link).toMatchObject({ kind: 'room', roomId, roomNumber: '1.01', locked: false });
    expect(get(rc).link).toMatchObject({ kind: 'walls', locked: false });
    const before = maxX(get(floor));

    c.ai.call('wall.move', { wallIds: [walls[2]], vector: { x: 500, y: 0 } });
    expect(maxX(get(floor))).toBe(before + 500);
    expect(maxX(get(rc))).toBe(before + 500);

    c.ai.call('slab.move', { slabIds: [floor], vector: { x: 0, y: 100 } });
    expect(get(floor).link?.locked).toBe(true);
    c.ai.call('wall.move', { wallIds: [walls[2]], vector: { x: -500, y: 0 } });
    expect(maxX(get(floor))).toBe(before + 500);
    expect(maxX(get(rc))).toBe(before);

    c.ai.call('slab.restoreLink', { slabId: floor });
    expect(get(floor)).toMatchObject({ link: { locked: false } });
    expect(maxX(get(floor))).toBe(before);
    c.ai.call('slab.unlink', { slabIds: [rc] });
    expect(get(rc).link).toBeNull();
  });

  it('podlaha pod dveřmi: otvor k podlaze v příčce, opening.list ukáže floorSplit, celá z jedné místnosti', () => {
    const c = start();
    room(c);
    const types = c.ai.call<{ id: string; name: string }[]>('slabType.list');
    const floorType = must(types.find((t) => t.name === 'Podlaha anhydrit 150')).id;
    const [p] = c.ai.call<string[]>('wall.create', {
      storeyId: c.storeyId,
      typeId: c.typeId,
      path: { kind: 'line', start: { x: 3000, y: 0 }, end: { x: 3000, y: 4000 } },
      autoConnect: true,
    });
    const [door] = c.ai.call<string[]>('opening.create', {
      wallId: p,
      offset: 1500,
      width: 900,
      height: 2100,
      sill: 0,
    });
    const floors = [1500, 4500].map((x) => {
      const [roomId] = c.ai.call<string[]>('room.create', { storeyId: c.storeyId, point: { x, y: 2000 } });
      return must(c.ai.call<string[]>('slab.create', { storeyId: c.storeyId, typeId: floorType, roomId })[0]);
    });
    const area = () =>
      floors.map((id) => must(c.ai.call<SlabRow[]>('slab.list').find((s) => s.id === id)).area);
    const ops = c.ai.call<{ id: string; floorSplit?: string }[]>('opening.list', { wallId: p });
    expect(must(ops[0]).floorSplit).toBe('split');
    const split = area();
    c.ai.call('opening.setFloorSplit', { openingIds: [door], split: 'none' });
    const none = area();
    expect(split.map((a, i) => a > (none[i] ?? 0))).toEqual([true, true]);
  });
});
