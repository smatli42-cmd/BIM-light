// AI scénář: řezy a pohledy (rozhodnutí 19) jen JSON voláními nástrojů – řez místností, obsah řezu,
// hloubka pohledu, pohledy kolem budovy, přejmenování a smazání.
import { describe, expect, it } from 'vitest';
import { must, room, start } from './scenario-helpers.ts';

interface SectionRow {
  id: string;
  kind: string;
  name: string;
  mark: string;
  depth: number | null;
  cutPlane3d: { normal: { x: number; y: number; z: number } };
}
interface Content {
  cut: { elementId: string; category: string; bottom: number; top: number }[];
  seen: { elementId: string; category: string; depth: number }[];
}

describe('AI scénář: řezy a pohledy', () => {
  it('řez místností: proříznuté stěny a strop, za rovinou stěna, hloubka pohledu ji schová', () => {
    const c = start();
    const [left, top, , bottom] = room(c);
    const rc = must(
      c.ai.call<{ id: string; name: string }[]>('slabType.list').find((t) => t.name === 'ŽB strop 250'),
    );
    const rect = { a: { x: 0, y: 0 }, b: { x: 6000, y: 4000 } };
    const [slab] = c.ai.call<string[]>('slab.create', {
      storeyId: c.storeyId,
      typeId: rc.id,
      rect,
      topOffset: 3000,
    });
    const [id] = c.ai.call<string[]>('section.create', {
      start: { x: 3000, y: -2000 },
      end: { x: 3000, y: 6000 },
    });
    const row = must(c.ai.call<SectionRow[]>('section.list').find((s) => s.id === id));
    expect(row).toMatchObject({ kind: 'section', name: 'Řez A', mark: 'A', depth: 15000 });
    expect(row.cutPlane3d.normal.x).toBe(-1);
    const content = c.ai.call<Content>('section.elements', { sectionId: id });
    const cutIds = content.cut.map((r) => r.elementId);
    expect(cutIds).toEqual(expect.arrayContaining([top, bottom, slab]));
    expect(must(content.cut.find((r) => r.elementId === slab)).top).toBe(3000);
    const seenLeft = must(content.seen.find((r) => r.elementId === left));
    expect(seenLeft.depth).toBeGreaterThan(2500);
    c.ai.call('section.update', { sectionId: id, depth: 1000 });
    const near = c.ai.call<Content>('section.elements', { sectionId: id });
    expect(near.seen.some((r) => r.elementId === left)).toBe(false);
  });

  it('pohledy kolem budovy: 4 fasády bez řezu, přejmenování a smazání', () => {
    const c = start();
    room(c);
    const ids = c.ai.call<string[]>('elevation.create', { margin: 2000 });
    expect(ids).toHaveLength(4);
    const rows = c.ai.call<SectionRow[]>('section.list');
    expect(rows.map((r) => r.name)).toEqual([
      'Pohled jižní',
      'Pohled východní',
      'Pohled severní',
      'Pohled západní',
    ]);
    const south = c.ai.call<Content>('section.elements', { sectionId: ids[0] });
    expect(south.cut).toEqual([]);
    expect(south.seen.length).toBeGreaterThan(0);
    c.ai.call('section.rename', { sectionId: ids[0], name: 'Pohled jižní – vstup' });
    c.ai.call('section.delete', { sectionId: ids[3] });
    const after = c.ai.call<SectionRow[]>('section.list');
    expect(after.map((r) => r.name)).toEqual(['Pohled jižní – vstup', 'Pohled východní', 'Pohled severní']);
  });
});
