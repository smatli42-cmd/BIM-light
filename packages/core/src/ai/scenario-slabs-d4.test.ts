// AI scénář desky D4: vršek stěn k desce, výkaz desek a kóty k hranám desky jen JSON voláními nástrojů.
import { describe, expect, it } from 'vitest';
import { must, room, start, type DimRow } from './scenario-helpers.ts';

interface TopRow {
  wallId: string;
  attachedSlabId: string | null;
  slabAboveId: string | null;
  top: number;
}
interface Table {
  rows: { kind: string; cells: Record<string, unknown> }[];
}

/** Místnost ve 1.NP a strop 2.NP (ŽB 250) nad ní. */
function setup() {
  const c = start();
  const walls = room(c);
  const [s2] = c.ai.call<string[]>('storey.create', { name: '2.NP', elevation: 3000, height: 3000 });
  const types = c.ai.call<{ id: string; name: string }[]>('slabType.list');
  const rc = must(types.find((t) => t.name === 'ŽB strop 250')).id;
  const rect = { a: { x: -500, y: -500 }, b: { x: 6500, y: 4500 } };
  const [slab] = c.ai.call<string[]>('slab.create', { storeyId: s2, typeId: rc, rect });
  return { c, walls, slab: must(slab), s2: must(s2), types };
}

describe('AI scénář: desky D4', () => {
  it('vršek stěn k desce: dotaz najde desku nad stěnou, změna desky stěny přepočítá', () => {
    const { c, walls, slab } = setup();
    const before = c.ai.call<TopRow[]>('wall.topSlab', { storeyId: c.storeyId });
    expect(before.every((r) => r.slabAboveId === slab && r.attachedSlabId === null)).toBe(true);
    c.ai.call('wall.attachTop', { wallIds: walls });
    const after = c.ai.call<TopRow[]>('wall.topSlab', { wallIds: walls });
    expect(after.map((r) => [r.attachedSlabId, r.top])).toEqual(walls.map(() => [slab, 2590]));
    c.ai.call('slab.update', { slabIds: [slab], topOffset: -100 });
    expect(must(c.ai.call<TopRow[]>('wall.topSlab', { wallIds: walls })[0]).top).toBe(2640);
    c.ai.call('wall.detachTop', { wallIds: walls });
    expect(c.ai.call<TopRow[]>('wall.topSlab').every((r) => r.attachedSlabId === null)).toBe(true);
  });

  it('výkaz desek: schedule.list ho má, schedule.table vrátí plochu bez otvorů a objem', () => {
    const { c, slab } = setup();
    c.ai.call('slabOpening.create', {
      storeyId: must(c.ai.call<{ storeyId: string }[]>('slab.list')[0]).storeyId,
      rect: { a: { x: 0, y: 0 }, b: { x: 1000, y: 1000 } },
    });
    const defs = c.ai.call<{ id: string; name: string; source: string }[]>('schedule.list');
    const def = must(defs.find((d) => d.source === 'slabs'));
    expect(def.name).toBe('Výkaz desek');
    const t = c.ai.call<Table>('schedule.table', { scheduleId: def.id });
    const item = must(t.rows.find((r) => r.kind === 'item')).cells;
    expect(item).toMatchObject({ mark: 'D1', storey: '2.NP', area: 35, netArea: 34, thickness: 260 });
    expect(slab).toBeTruthy();
  });

  it('kóta k hranám desky: šířka stropu a kóta líc stěny – hrana desky; kóta patří podlaží desky', () => {
    const { c, walls, slab, s2 } = setup();
    const edge = (i: number) => ({ outline: 'slab', ownerId: slab, edge: i });
    const viewId = c.viewId;
    const [width] = c.ai.call<string[]>('dimension.create', {
      kind: 'linear',
      refs: [edge(0), edge(2)],
      viewId,
    });
    const top = { wallId: must(walls[1]), face: 'ref' };
    const [gap] = c.ai.call<string[]>('dimension.create', { kind: 'linear', refs: [edge(2), top], viewId });
    const dims = c.ai.call<(DimRow & { storeyId: string })[]>('dimension.list');
    expect(must(dims.find((d) => d.id === width))).toMatchObject({ value: 5000, storeyId: s2 });
    expect(must(dims.find((d) => d.id === gap)).value).toBe(500);
  });
});
