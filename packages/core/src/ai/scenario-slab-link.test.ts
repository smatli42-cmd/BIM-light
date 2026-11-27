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
});
