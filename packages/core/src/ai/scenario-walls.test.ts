// Scénář „AI kreslí dům“, část stěny (plán stěn Z1–Z5): jen JSON volání nástrojů, žádná obrazovka.
import { describe, expect, it } from 'vitest';
import { room, row, start } from './scenario-helpers.ts';
import type { DimRow, WallRow } from './scenario-helpers.ts';

describe('AI scénář: stěny (plán stěn Z1–Z5)', () => {
  it('typ stěny přes AI: vlastní skladba, přiřazení stěně, smazání s náhradou (plán stěn Z1)', () => {
    interface TypeRow {
      id: string;
      name: string;
      thickness: number;
      usage: number;
    }
    const c = start();
    const [left] = room(c);
    const mats = c.ai.call<{ id: string; name: string }[]>('material.list');
    const m = (name: string) => mats.find((x) => x.name === name)!.id;
    const [typeId] = c.ai.call<string[]>('wallType.create', {
      name: 'Obvod AI',
      layers: [
        { materialId: m('Omítka'), thickness: 15, function: 'finish' },
        { materialId: m('Zdivo keramické'), thickness: 300, function: 'core' },
        { materialId: m('Tepelná izolace EPS'), thickness: 200, function: 'insulation' },
      ],
    });
    c.ai.call('wall.setType', { wallIds: [left], typeId });
    const t = c.ai.call<TypeRow[]>('wallType.list').find((x) => x.id === typeId)!;
    expect([t.thickness, t.usage]).toEqual([515, 1]);
    expect(row(c.ai.call<WallRow[]>('wall.list'), left!).thickness).toBe(515);
    c.ai.call('wallType.delete', { typeId, replacementId: c.typeId });
    expect(row(c.ai.call<WallRow[]>('wall.list'), left!).thickness).toBe(300);
  });

  it('napojení vrstev přes AI: obrys vrstev v rohu, kříž, nespojovat (plán stěn Z2)', () => {
    interface LayerRow {
      material: string;
      area: number;
    }
    const c = start();
    const [left, top] = room(c);
    const layers = (id: string) => c.ai.call<{ layers: LayerRow[] }>('wall.get', { wallId: id }).layers;
    expect(layers(left!)[0]!.area).toBeGreaterThan(0);
    const [a] = c.ai.call<string[]>('wall.create', {
      storeyId: c.storeyId,
      typeId: c.typeId,
      path: { kind: 'line', start: { x: 3000, y: 1000 }, end: { x: 3000, y: 3000 } },
    });
    const [b] = c.ai.call<string[]>('wall.create', {
      storeyId: c.storeyId,
      typeId: c.typeId,
      path: { kind: 'line', start: { x: 2000, y: 2000 }, end: { x: 4000, y: 2000 } },
    });
    const before = layers(a!)[0]!.area;
    c.ai.call('wall.cross', { wallId: a, toWallId: b });
    expect(layers(a!)[0]!.area).toBeLessThan(before);
    c.ai.call('wall.setJoin', { wallId: top, end: 'start', join: false });
    const w = row(c.ai.call<WallRow[]>('wall.list'), top!);
    expect(w.ends.start).toBe('free');
  });

  it('výška a podlaží přes AI: stěna přes dvě podlaží, změna výšky 1.NP, smazání podlaží (plán stěn Z3)', () => {
    interface HeightRow {
      id: string;
      bottom: number;
      top: number;
      wallHeight: number;
    }
    const c = start();
    const [left] = room(c);
    const [s2] = c.ai.call<string[]>('storey.create', { name: '2.NP', elevation: 3000, height: 3000 });
    const h = () => c.ai.call<HeightRow[]>('wall.list').find((w) => w.id === left)!;
    expect(h()).toMatchObject({ bottom: 0, top: 3000 });
    c.ai.call('wall.setHeight', {
      wallIds: [left],
      height: { baseOffset: 0, top: { kind: 'storey', storeys: 2, offset: -200 } },
    });
    expect(h()).toMatchObject({ top: 5800, wallHeight: 5800 });
    c.ai.call('storey.update', { storeyId: c.storeyId, height: 3100 });
    expect(h().top).toBe(5900);
    expect(() => c.ai.call('storey.delete', { storeyId: s2 })).toThrow(/prvků/);
  });

  it('otvory přes AI: otvor, výřez, niky, kóty celé stěny, odmítnutí (plán stěn Z4)', () => {
    const c = start();
    const [, top] = room(c);
    const [o] = c.ai.call<string[]>('opening.create', { wallId: top, offset: 1000, width: 1200 });
    c.ai.call('opening.create', { wallId: top, offset: 4000, width: 800, kind: 'niche', depth: 100 });
    const list = c.ai.call<{ id: string; plan: string; offset: number }[]>('opening.list', { wallId: top });
    expect(list.map((x) => [x.offset, x.plan])).toEqual([
      [1000, 'cut'],
      [4000, 'cut'],
    ]);
    const dims = c.ai.call<string[]>('dimension.wholeWall', { wallId: top, side: 'ref', viewId: c.viewId });
    const rows = c.ai.call<DimRow[]>('dimension.list');
    expect(dims.map((d) => rows.find((r) => r.id === d)!.value)).toEqual([1000, 1200, 1800, 800, 1200, 6000]);
    expect(c.ai.raw('opening.move', { openingIds: [o], distance: 5000 }).error?.message).toMatch(/vyčníval/);
    c.ai.call('opening.delete', { openingIds: [o] });
    expect(c.ai.call<unknown[]>('opening.list')).toHaveLength(1);
  });
});
