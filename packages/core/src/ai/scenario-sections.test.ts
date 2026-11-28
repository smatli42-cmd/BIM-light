// AI scénář: řezy a pohledy (rozhodnutí 19) jen JSON voláními nástrojů – řez místností, obsah řezu,
// hloubka pohledu, přejmenování a smazání (automatické pohledy v scenario-elevations).
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
    // Výběr v řezu (pokyn uživatele 2026-11-27): bod výkresu → prvek, rámeček zprava → i protnuté; smazání.
    const row0 = must(content.cut.find((r) => r.elementId === slab));
    const picked = c.ai.call<string[]>('section.pick', { sectionId: id, u: 4000, z: row0.top - 50 });
    expect(picked[0]).toBe(slab);
    const box = c.ai.call<string[]>('section.pickBox', {
      sectionId: id,
      a: { x: 2300, y: 500 },
      b: { x: 1700, y: 600 },
      crossing: true,
    });
    expect(box).toContain(bottom);
    c.ai.call('section.update', { sectionId: id, depth: 1000 });
    const near = c.ai.call<Content>('section.elements', { sectionId: id });
    expect(near.seen.some((r) => r.elementId === left)).toBe(false);
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

  it('kóta v řezu: AI najde boky stěny a okótuje tloušťku, pak výšku podlaží ke stropu', () => {
    const c = start();
    const [left] = room(c);
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
      start: { x: -2000, y: 2000 },
      end: { x: 8000, y: 2000 },
    });
    type Side = { ref: { elementId: string; side: string }; u: number };
    const sides = c.ai
      .call<Side[]>('sectionDim.sides', { sectionId: sec })
      .filter((x) => x.ref.elementId === left);
    expect(sides).toHaveLength(2);
    const [w] = c.ai.call<string[]>('sectionDim.create', {
      sectionId: sec,
      a: must(sides[0]).ref,
      b: must(sides[1]).ref,
      offset: 3500,
    });
    const [h] = c.ai.call<string[]>('sectionDim.create', {
      sectionId: sec,
      a: { kind: 'storey', storeyId: c.storeyId },
      b: { kind: 'edge', elementId: slab, edge: 'bottom' },
      offset: -1000,
    });
    const rows = c.ai.call<{ id: string; value: number }[]>('sectionDim.list', { sectionId: sec });
    expect(must(rows.find((r) => r.id === w)).value).toBe(300);
    expect(must(rows.find((r) => r.id === h)).value).toBeGreaterThan(2000);
  });

  it('uložení stropu (priorita materiálů): strop v řezu, zateplení obvodové stěny jde přes čelo desky', () => {
    const c = start();
    const types = c.ai.call<{ id: string; name: string }[]>('wallType.list');
    const typeId = must(types.find((t) => t.name === 'Obvodová zateplená 465')).id;
    const [wall] = c.ai.call<string[]>('wall.create', {
      storeyId: c.storeyId,
      typeId,
      path: { kind: 'line', start: { x: 0, y: 0 }, end: { x: 6000, y: 0 } },
    });
    const rc = must(
      c.ai.call<{ id: string; name: string }[]>('slabType.list').find((t) => t.name === 'ŽB strop 250'),
    );
    const rect = { a: { x: -1000, y: -2000 }, b: { x: 7000, y: 2000 } };
    const [slab] = c.ai.call<string[]>('slab.create', {
      storeyId: c.storeyId,
      typeId: rc.id,
      rect,
      topOffset: 3000,
    });
    const [sec] = c.ai.call<string[]>('section.create', {
      start: { x: 3000, y: -3000 },
      end: { x: 3000, y: 3000 },
    });
    type Row = { elementId: string; u0: number; u1: number; bottom: number; top: number };
    const cut = c.ai.call<{ cut: Row[] }>('section.elements', { sectionId: sec }).cut;
    const w = must(cut.find((r) => r.elementId === wall));
    const s = must(cut.find((r) => r.elementId === slab));
    // Zeď (zateplení) jde přes čelo desky až nad ni; deska je v řezu celá ve své výšce.
    expect(w.top).toBeGreaterThanOrEqual(s.top);
    expect(s.top).toBe(3000);
  });
});
