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
    expect(row).toMatchObject({ kind: 'section', name: 'Řez A', mark: 'A', depth: null });
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

  it('zalomený řez se stylem řezu: posun, změna stylu, smazání stylu nechá hodnoty v řezu', () => {
    const c = start();
    room(c);
    const [pid] = c.ai.call<string[]>('sectionPreset.create', { name: 'Blízko', depth: 2000, farClip: 1000 });
    const points = [
      { x: 1000, y: -1000 },
      { x: 1000, y: 2000 },
      { x: 4000, y: 2000 },
      { x: 4000, y: 5000 },
    ];
    const [id] = c.ai.call<string[]>('section.create', { points, presetId: pid });
    let row = must(
      c.ai.call<(SectionRow & Record<string, unknown>)[]>('section.list').find((s) => s.id === id),
    );
    expect(row).toMatchObject({ jogged: true, presetName: 'Blízko', depth: 2000, farClip: 1000 });
    c.ai.call('section.move', { sectionId: id, delta: { x: 500, y: 0 } });
    c.ai.call('sectionPreset.update', { presetId: pid, depth: 8000 });
    c.ai.call('sectionPreset.delete', { presetId: pid });
    row = must(c.ai.call<(SectionRow & Record<string, unknown>)[]>('section.list').find((s) => s.id === id));
    expect(row).toMatchObject({ presetId: null, depth: 8000, farClip: 1000 });
    expect((row['points'] as { x: number }[])[0]?.x).toBe(1500);
    const presets = c.ai.call<{ name: string }[]>('sectionPreset.list');
    expect(presets.map((p) => p.name)).toContain('Řez – celá hloubka');
  });

  it('výšková kóta (ČSN 01 3420): AI najde hranu stropu v řezu, okótuje ji a po změně stropu vidí novou hodnotu', () => {
    const c = start();
    room(c);
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
    const [sec] = c.ai.call<string[]>('section.create', {
      start: { x: 3000, y: -2000 },
      end: { x: 3000, y: 6000 },
    });
    const targets = c.ai.call<{ ref: { kind: string; elementId?: string; edge?: string }; z: number }[]>(
      'levelDim.targets',
      { sectionId: sec },
    );
    const top = must(targets.find((t) => t.ref.elementId === slab && t.ref.edge === 'top'));
    expect(top.z).toBe(3000);
    const [id] = c.ai.call<string[]>('levelDim.create', { sectionId: sec, ref: top.ref, at: 1500 });
    c.ai.call('slab.update', { slabIds: [slab], topOffset: 3200 });
    const rows = c.ai.call<{ id: string; text: string; z: number }[]>('levelDim.list', { sectionId: sec });
    expect(must(rows.find((r) => r.id === id))).toMatchObject({ z: 3200, text: '+3,200' });
    c.ai.call('levelDim.move', { levelDimId: id, at: 2500, below: true });
    c.ai.call('levelDim.delete', { levelDimIds: [id] });
    expect(c.ai.call<unknown[]>('levelDim.list', {})).toHaveLength(0);
  });

  it('výšková kóta v půdorysu: AI okótuje podlahu, změní výšku podlahy a přepne na kótu terénu RT / UT', () => {
    const c = start();
    room(c);
    const types = c.ai.call<{ id: string; slabFunction: string }[]>('slabType.list');
    const typeId = must(types.find((t) => t.slabFunction === 'floor')).id;
    const rect = { a: { x: 0, y: 0 }, b: { x: 6000, y: 4000 } };
    const [floor] = c.ai.call<string[]>('slab.create', {
      storeyId: c.storeyId,
      typeId,
      rect,
      topOffset: 150,
    });
    const [id] = c.ai.call<string[]>('planLevelDim.create', {
      storeyId: c.storeyId,
      point: { x: 3000, y: 2000 },
      viewId: c.viewId,
    });
    type Row = { id: string; text: string; marker: string; lines: string[]; ref: { elementId?: string } };
    let row = must(c.ai.call<Row[]>('planLevelDim.list', {}).find((r) => r.id === id));
    expect(row).toMatchObject({ text: '+0,150', marker: 'box', ref: { elementId: floor } });
    c.ai.call('slab.update', { slabIds: [floor], topOffset: 0 });
    row = must(c.ai.call<Row[]>('planLevelDim.list', {}).find((r) => r.id === id));
    expect(row.text).toBe('±0,000');
    c.ai.call('planLevelDim.update', { levelDimId: id, marker: 'circle', rt: -150, ut: -100 });
    row = must(c.ai.call<Row[]>('planLevelDim.list', {}).find((r) => r.id === id));
    expect(row).toMatchObject({ text: 'RT=-0,150', marker: 'circle', lines: ['RT=-0,150', 'UT=-0,100'] });
  });
});
