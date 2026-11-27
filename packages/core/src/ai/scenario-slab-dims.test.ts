// AI scénář: přesný otvor v desce přes dočasné kóty (pokyn uživatele 2026-11-27) jen JSON voláními.
import { describe, expect, it } from 'vitest';
import { must, room, start } from './scenario-helpers.ts';

interface TempRow {
  side: string;
  value: number;
  other: { wallId?: string; ownerId?: string };
}

describe('AI scénář: dočasné kóty desky a otvoru v desce', () => {
  it('AI zjistí odstupy otvoru od lícu stěn a nastaví přesnou polohu; deska také', () => {
    const c = start();
    const walls = room(c);
    const types = c.ai.call<{ id: string; name: string }[]>('slabType.list');
    const typeId = must(types.find((t) => t.name === 'ŽB strop 250')).id;
    const rect = { a: { x: 0, y: 0 }, b: { x: 6000, y: 4000 } };
    const [slab] = c.ai.call<string[]>('slab.create', { storeyId: c.storeyId, typeId, rect });
    const hole = must(
      c.ai.call<string[]>('slabOpening.create', {
        storeyId: c.storeyId,
        rect: { a: { x: 1000, y: 1000 }, b: { x: 1600, y: 1400 } },
      })[0],
    );
    const dims = () => c.ai.call<TempRow[]>('outline.tempDimensions', { elementId: hole });
    expect(dims().map((d) => [d.side, d.value])).toEqual([
      ['x-', 1000],
      ['x+', 4400],
      ['y-', 1000],
      ['y+', 2600],
    ]);
    expect(walls).toContain(must(dims()[0]).other.wallId);
    c.ai.call('outline.setDistance', { elementId: hole, side: 'x-', value: 250 });
    c.ai.call('outline.setDistance', { elementId: hole, side: 'y+', value: 500 });
    const rows = c.ai.call<{ outline: { x: number; y: number }[] }[]>('slabOpening.list');
    expect(must(rows[0]).outline[0]).toEqual({ x: 250, y: 3100 });
    // Deska: kóty ven k obvodovým stěnám (k vnějšímu líci, hrana desky leží na vnitřním).
    const s = c.ai.call<TempRow[]>('outline.tempDimensions', { elementId: must(slab) });
    expect(s.length).toBe(4);
  });
});
