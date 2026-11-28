// AI scénář: popis skladby v řezu jen JSON voláními nástrojů – řez místností se stropem, bod ve stropu
// (section.pick), vložení popisu, řádky z typu (compositionTag.list), volby obsahu, posun a smazání; popis
// střechy kolmo k rovině (pokyn uživatele 2026-11-28).
import { describe, expect, it } from 'vitest';
import { must, room, start } from './scenario-helpers.ts';

interface Cut {
  cut: { elementId: string; u0: number; u1: number; bottom: number; top: number }[];
}
interface TagRow {
  id: string;
  lines: string[] | null;
  end: { x: number; y: number } | null;
  path: { x: number; y: number }[] | null;
  markText: string | null;
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
      points: [
        { x: at.x, y: 3800 },
        { x: at.x + 1000, y: 3800 },
      ],
    });
    const list = () => must(c.ai.call<TagRow[]>('compositionTag.list', { sectionId: sec })[0]);
    expect(list().markText).toBe('D1');
    expect(must(list().lines ?? undefined)[0]).toMatch(/ tl\. \d+ mm$/);
    c.ai.call('compositionTag.update', { tagId: tag, title: true, numbered: true, side: 'left' });
    expect(must(list().lines ?? undefined)[0]).toMatch(/^ŽB strop 250 – \d+ mm$/);
    expect(must(list().lines ?? undefined)[1]).toMatch(/^1\. /);
    c.ai.call('compositionTag.move', { tagId: tag, delta: { x: -2500, y: 100 } });
    expect(list().end).toEqual({ x: at.x - 1500, y: 3900 });
    c.ai.call('selection.delete', { levelDimIds: [tag] });
    expect(c.ai.call<TagRow[]>('compositionTag.list', {})).toEqual([]);
  });

  it('pokyn uživatele / střechy: popis valbové střechy 45° – čára kolmo k rovině, krytina nahoře, číslo R1', () => {
    const c = start();
    const t = must(
      c.ai
        .call<{ id: string; name: string }[]>('roofType.list')
        .find((x) => x.name === 'Šikmá střecha, pálená krytina'),
    );
    const [roof] = c.ai.call<string[]>('roof.create', {
      storeyId: c.storeyId,
      typeId: t.id,
      rect: { a: { x: 0, y: 0 }, b: { x: 10000, y: 6000 } },
      shape: 'hip',
      slope: 45,
      refOffset: 3000,
    });
    const [sec] = c.ai.call<string[]>('section.create', {
      start: { x: 5000, y: -2000 },
      end: { x: 5000, y: 8000 },
    });
    const r = must(
      c.ai.call<Cut>('section.elements', { sectionId: sec }).cut.find((x) => x.elementId === roof),
    );
    // Bod kdekoli nad levou rovinou: jádro ho srovná na rovinu (kolmo k ní, v rozsahu skladby).
    const at = { x: r.u0 + (r.u1 - r.u0) * 0.25, y: r.bottom };
    c.ai.call('compositionTag.create', { sectionId: sec, elementId: roof, at });
    const tag = must(c.ai.call<TagRow[]>('compositionTag.list', { sectionId: sec })[0]);
    expect(tag.markText).toBe('R1');
    expect(must(tag.lines ?? undefined)[0]).toBe('Krytina pálená tl. 30 mm');
    const [p0, p1] = must(tag.path ?? undefined);
    const angle = (Math.atan2(Math.abs(p1!.x - p0!.x), p1!.y - p0!.y) * 180) / Math.PI;
    expect(angle).toBeCloseTo(45, 3);
  });
});
