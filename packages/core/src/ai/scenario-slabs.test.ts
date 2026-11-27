// AI scénář desky (D1): strop a podlaha nad místností jen JSON voláními nástrojů.
import { describe, expect, it } from 'vitest';
import { must, room, start } from './scenario-helpers.ts';

interface SlabTypeRow {
  id: string;
  name: string;
  thickness: number;
  slabFunction: string;
}
interface SlabRow {
  id: string;
  top: number;
  bottom: number;
  thickness: number;
  area: number;
  slabFunction: string;
  ifcClass: string;
}

describe('AI scénář: deska (D1)', () => {
  it('podlaha a strop v místnosti: výšky líců, plocha, změna typu a posun bodu obrysu', () => {
    const c = start();
    room(c);
    const types = c.ai.call<SlabTypeRow[]>('slabType.list');
    const floorType = must(types.find((t) => t.name === 'Podlaha anhydrit 150'));
    const rcType = must(types.find((t) => t.name === 'ŽB strop 250'));
    const rect = { a: { x: 0, y: 0 }, b: { x: 6000, y: 4000 } };
    const [floor] = c.ai.call<string[]>('slab.create', { storeyId: c.storeyId, typeId: floorType.id, rect });
    const [rc] = c.ai.call<string[]>('slab.create', { storeyId: c.storeyId, typeId: rcType.id, rect });
    const rows = c.ai.call<SlabRow[]>('slab.list', { storeyId: c.storeyId });
    const f = must(rows.find((r) => r.id === floor));
    const s = must(rows.find((r) => r.id === rc));
    expect([f.top, f.bottom, f.area, f.ifcClass]).toEqual([0, -150, 24, 'IfcCovering']);
    expect([s.top, s.bottom, s.thickness, s.ifcClass]).toEqual([-150, -410, 260, 'IfcSlab']);
    c.ai.call('slab.moveVertex', { slabId: floor, index: 2, point: { x: 6000, y: 5000 } });
    expect(must(c.ai.call<SlabRow[]>('slab.list').find((r) => r.id === floor)).area).toBe(27);
    const wood = must(types.find((t) => t.name === 'Podlaha dřevěná 120'));
    c.ai.call('slab.update', { slabIds: [floor], typeId: wood.id });
    expect(must(c.ai.call<SlabRow[]>('slab.list').find((r) => r.id === floor)).bottom).toBe(-120);
    c.ai.call('selection.delete', { slabIds: [floor, rc] });
    expect(c.ai.call<SlabRow[]>('slab.list')).toHaveLength(0);
  });

  it('D2: strop podle stěn místnosti – obrys po vnitřním líci', () => {
    const c = start();
    const walls = room(c);
    const rcType = must(c.ai.call<SlabTypeRow[]>('slabType.list').find((t) => t.name === 'ŽB strop 250'));
    const [rc] = c.ai.call<string[]>('slab.create', {
      storeyId: c.storeyId,
      typeId: rcType.id,
      walls: { wallIds: walls, boundary: 'face' },
    });
    const row = must(c.ai.call<SlabRow[]>('slab.list').find((r) => r.id === rc));
    // Řetěz po směru hodin s tloušťkou ven: vnitřní líc = zadaný obdélník 6 × 4 m.
    expect(row.area).toBe(24);
  });

  it('D3: otvor pro schodiště prořízne strop i podlahu; čistá plocha', () => {
    const c = start();
    const types = c.ai.call<SlabTypeRow[]>('slabType.list');
    const rect = { a: { x: 0, y: 0 }, b: { x: 6000, y: 4000 } };
    for (const name of ['ŽB strop 250', 'Podlaha anhydrit 150'])
      c.ai.call('slab.create', {
        storeyId: c.storeyId,
        typeId: must(types.find((t) => t.name === name)).id,
        rect,
      });
    const [hole] = c.ai.call<string[]>('slabOpening.create', {
      storeyId: c.storeyId,
      rect: { a: { x: 1000, y: 1000 }, b: { x: 3000, y: 2000 } },
    });
    const holes = c.ai.call<{ id: string; hostIds: string[]; area: number }[]>('slabOpening.list');
    expect(holes).toEqual([expect.objectContaining({ id: hole, area: 2 })]);
    expect(must(holes[0]).hostIds).toHaveLength(2);
    const rows = c.ai.call<(SlabRow & { netArea: number; openings: number })[]>('slab.list');
    expect(rows.map((r) => [r.netArea, r.openings])).toEqual([
      [22, 1],
      [22, 1],
    ]);
  });
});
