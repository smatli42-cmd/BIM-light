// AI scénář: popis skladby v řezu jen JSON voláními nástrojů – řez místností se stropem, bod ve stropu
// (section.pick), vložení popisu, řádky z typu (compositionTag.list), volby obsahu, posun a smazání.
import { describe, expect, it } from 'vitest';
import { must, room, start } from './scenario-helpers.ts';

interface Cut {
  cut: { elementId: string; u0: number; u1: number; bottom: number; top: number }[];
}
interface TagRow {
  id: string;
  lines: string[] | null;
  textAt: { x: number; y: number } | null;
}

describe('AI scénář: popis skladby v řezu', () => {
  it('řez stropem: popis vrstev ŽB stropu, číslování, posun textu, smazání', () => {
    const c = start();
    room(c);
    const rc = must(
      c.ai.call<{ id: string; name: string }[]>('slabType.list').find((t) => t.name === 'ŽB strop 250'),
    );
    const [slab] = c.ai.call<string[]>('slab.create', {
      storeyId: c.storeyId,
      typeId: rc.id,
      rect: { a: { x: 0, y: 0 }, b: { x: 6000, y: 4000 } },
      topOffset: 3000,
    });
    const [sec] = c.ai.call<string[]>('section.create', {
      start: { x: 3000, y: -2000 },
      end: { x: 3000, y: 6000 },
    });
    const row = must(
      c.ai.call<Cut>('section.elements', { sectionId: sec }).cut.find((r) => r.elementId === slab),
    );
    const at = { x: (row.u0 + row.u1) / 2, y: (row.bottom + row.top) / 2 };
    expect(c.ai.call<string[]>('section.pick', { sectionId: sec, u: at.x, z: at.y })[0]).toBe(slab);
    const [tag] = c.ai.call<string[]>('compositionTag.create', {
      sectionId: sec,
      elementId: slab,
      at,
      textAt: { x: at.x + 1000, y: 3800 },
    });
    const list = () => must(c.ai.call<TagRow[]>('compositionTag.list', { sectionId: sec })[0]);
    expect(must(list().lines ?? undefined)[0]).toMatch(/^D1 ŽB strop 250 – \d+ mm$/);
    c.ai.call('compositionTag.update', { tagId: tag, numbered: true, title: false });
    expect(must(list().lines ?? undefined)[0]).toMatch(/^1\. /);
    c.ai.call('compositionTag.move', { tagId: tag, textAt: { x: at.x - 1500, y: 3900 } });
    expect(list().textAt).toEqual({ x: at.x - 1500, y: 3900 });
    c.ai.call('selection.delete', { levelDimIds: [tag] });
    expect(c.ai.call<TagRow[]>('compositionTag.list', {})).toEqual([]);
  });
});
