// AI scénář: úchopy v řezu (pokyn uživatele 2026-11-27) jen JSON voláními – AI vidí úchopy vybraných prvků
// (section.grips) a posune hranu stejným příkazem jako tažení myší (element.setEdgeLevel).
import { describe, expect, it } from 'vitest';
import { must, room, start } from './scenario-helpers.ts';

interface Grip {
  elementId: string;
  edge: 'top' | 'bottom';
  u: number;
  z: number;
  label: string;
  value: number;
}
interface Grips {
  grips: Grip[];
  snap: { z: number; label: string }[];
}

describe('AI scénář: úchopy v řezu', () => {
  it('scénář-řezy / úchopy: vršek stěny, parapet okna a poloha stropu tažením hrany v řezu', () => {
    const c = start();
    const [, , , bottom] = room(c);
    const wallId = must(bottom);
    const [win] = c.ai.call<string[]>('opening.create', { wallId, offset: 2500, width: 1000, sill: 900 });
    const rc = must(
      c.ai.call<{ id: string; name: string }[]>('slabType.list').find((t) => t.name === 'ŽB strop 250'),
    );
    const [slab] = c.ai.call<string[]>('slab.create', {
      storeyId: c.storeyId,
      typeId: rc.id,
      rect: { a: { x: 0, y: 0 }, b: { x: 6000, y: 4000 } },
      topOffset: 3500,
    });
    const [sec] = c.ai.call<string[]>('section.create', {
      start: { x: 3000, y: -2000 },
      end: { x: 3000, y: 6000 },
    });
    const g = c.ai.call<Grips>('section.grips', { sectionId: sec, elementIds: [wallId] });
    expect(g.grips.map((x) => x.edge)).toEqual(['top', 'bottom']);
    expect(g.snap.some((l) => l.label === '1.NP')).toBe(true);
    c.ai.call('element.setEdgeLevel', { elementId: wallId, edge: 'top', z: 2800 });
    const after = c.ai.call<Grips>('section.grips', { sectionId: sec, elementIds: [wallId, win, slab] });
    const of = (id: unknown, edge: string) =>
      must(after.grips.find((x) => x.elementId === id && x.edge === edge));
    expect(of(wallId, 'top')).toMatchObject({ z: 2800, value: 2800 });
    c.ai.call('element.setEdgeLevel', { elementId: win, edge: 'bottom', z: 600 });
    const w = must(
      c.ai.call<{ id: string; sill: number; height: number }[]>('opening.list').find((o) => o.id === win),
    );
    expect([w.sill, w.height]).toEqual([600, 1800]);
    c.ai.call('element.setEdgeLevel', { elementId: slab, edge: 'top', z: 3200 });
    const top = c.ai.call<Grips>('section.grips', { sectionId: sec, elementIds: [slab] });
    expect(must(top.grips.find((x) => x.edge === 'top'))).toMatchObject({ z: 3200, value: 3200 });
  });
});
