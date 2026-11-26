// Scénář „AI kreslí dům“, část stěny (plán stěn Z1–Z5, Z7, Z8): jen JSON volání nástrojů, žádná obrazovka.
import { describe, expect, it } from 'vitest';
import { room, row, start } from './scenario-helpers.ts';
import type { DimRow, WallRow } from './scenario-helpers.ts';

describe('AI scénář: stěny (plán stěn Z1–Z5, Z7, Z8)', () => {
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

  it('oblouk přes AI: kruhová stěna ze dvou oblouků, zakřivení, kóty oblouku, otvor (plán stěn Z5)', () => {
    interface ArcRow extends WallRow {
      arc: { radius: number; sweepDeg: number } | null;
    }
    const c = start();
    const arc = (sx: number, ex: number, bulge: number) => ({
      kind: 'arc',
      start: { x: sx, y: 0 },
      end: { x: ex, y: 0 },
      bulge,
    });
    const [a] = c.ai.call<string[]>('wall.create', {
      storeyId: c.storeyId,
      typeId: c.typeId,
      path: arc(5000, -5000, 1),
    });
    const [b] = c.ai.call<string[]>('wall.create', {
      storeyId: c.storeyId,
      typeId: c.typeId,
      path: arc(-5000, 5000, 1),
      connections: [
        { end: 'start', wallId: a, at: 'ATEND' },
        { end: 'end', wallId: a, at: 'ATSTART' },
      ],
    });
    const rows = c.ai.call<ArcRow[]>('wall.list');
    expect(row(rows, a!).ends).toEqual({ start: 'straight', end: 'straight' });
    expect((row(rows, b!) as ArcRow).arc).toMatchObject({ radius: 5000, sweepDeg: 180 });
    const [w] = c.ai.call<string[]>('wall.create', {
      storeyId: c.storeyId,
      typeId: c.typeId,
      path: { kind: 'line', start: { x: 8000, y: 0 }, end: { x: 14000, y: 0 } },
    });
    c.ai.call('wall.curve', { wallId: w, radius: -5000 });
    const ref = { wallId: w, face: 'ref' };
    const [r] = c.ai.call<string[]>('dimension.create', {
      kind: 'length',
      ref,
      measure: 'radius',
      viewId: c.viewId,
    });
    const [ch] = c.ai.call<string[]>('dimension.create', {
      kind: 'length',
      ref,
      measure: 'chord',
      viewId: c.viewId,
    });
    const val = (id: string) => c.ai.call<DimRow[]>('dimension.list').find((d) => d.id === id)!.value;
    expect([val(r!), val(ch!)]).toEqual([5000, 6000]);
    c.ai.call('opening.create', { wallId: w, offset: 2000, width: 1000 });
    expect(c.ai.call<string[]>('dimension.wholeWall', { wallId: w, viewId: c.viewId })).toHaveLength(4);
    const [short] = c.ai.call<string[]>('wall.create', {
      storeyId: c.storeyId,
      typeId: c.typeId,
      path: { kind: 'line', start: { x: 0, y: -8000 }, end: { x: 400, y: -8000 } },
    });
    expect(c.ai.raw('wall.curve', { wallId: short, radius: 200 }).error?.message).toMatch(/oloměr/);
    c.ai.call('wall.straighten', { wallIds: [w] });
    expect((row(c.ai.call<ArcRow[]>('wall.list'), w!) as ArcRow).arc).toBeNull();
  });

  it('vlastnosti stěny přes AI: typ obvodový a nosný, přepis u jedné stěny, návrat k typu (plán stěn Z7)', () => {
    interface PropRow {
      wallId: string;
      properties: { function: string; loadBearing: boolean; isExternal: boolean; fireRating: string };
      overridden: string[];
      ifcPredefinedType: string;
    }
    const c = start();
    const [left, top] = room(c);
    c.ai.call('wallType.setProperties', {
      typeId: c.typeId,
      properties: { function: 'exterior', isExternal: true, fireRating: 'REI 90 DP1' },
    });
    c.ai.call('wall.setProperties', {
      wallIds: [top],
      properties: { function: 'partition', loadBearing: false },
    });
    const [l, t] = c.ai.call<PropRow[]>('wall.properties', { wallIds: [left, top] });
    expect(l?.properties).toMatchObject({
      function: 'exterior',
      loadBearing: true,
      fireRating: 'REI 90 DP1',
    });
    expect(t?.ifcPredefinedType).toBe('PARTITIONING');
    expect(t?.overridden.sort()).toEqual(['function', 'loadBearing']);
    c.ai.call('wall.setProperties', { wallIds: [top], properties: { function: null, loadBearing: null } });
    expect(c.ai.call<PropRow[]>('wall.properties', { wallIds: [top] })[0]?.overridden).toEqual([]);
  });

  it('výkazy přes AI: výkaz stěn, vlastní výkaz podle podlaží, legenda a CSV (plán stěn Z8)', () => {
    interface Table {
      rows: { kind: string; cells: Record<string, unknown> }[];
    }
    const c = start();
    const [left] = room(c);
    c.ai.call('opening.create', { wallId: left, offset: 1000, width: 1000, height: 2000 });
    const list = c.ai.call<{ id: string; name: string }[]>('schedule.list');
    const walls = list.find((s) => s.name === 'Výkaz stěn')!.id;
    const t = c.ai.call<Table>('schedule.table', { scheduleId: walls });
    expect(t.rows.find((r) => r.kind === 'total')?.cells).toMatchObject({ count: 4, openingArea: 2 });
    const [own] = c.ai.call<string[]>('schedule.create', {
      name: 'Objem podle stavu',
      source: 'walls',
      fields: ['status', 'volume'],
      groupBy: ['status'],
      itemize: false,
    });
    const rows = c.ai.call<Table>('schedule.table', { scheduleId: own }).rows;
    expect(rows[0]?.cells.status).toBe('nový');
    const legend = list.find((s) => s.name === 'Legenda skladeb')!.id;
    expect(c.ai.call<string>('schedule.table', { scheduleId: legend, format: 'csv' })).toMatch(
      /^Značka;Typ;/,
    );
  });
});
