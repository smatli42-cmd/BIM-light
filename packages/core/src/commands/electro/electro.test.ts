import { describe, expect, it } from 'vitest';
import { projectV36toV37 } from '../../electro/project.ts';
import { createDefaultDisplay } from '../../style/presets/create.ts';
import { sequentialIds } from '../../ids/index.ts';
import { electroFixture, T } from '../../electro/test-helpers.ts';

const fail = (f: ReturnType<typeof electroFixture>, name: string, params: unknown) => {
  const r = f.editor.execute(name, params);
  return r.ok ? '' : r.error.message;
};

describe('koncepce 3 Elektro: příkazy prvků (základ 6)', () => {
  it('electro.create: instance nese třídu IFC typu, profesi elektro, stav nový a podlaží stěny (základy 1, 2)', () => {
    const f = electroFixture();
    const [id] = f.run('electro.create', { typeId: T('switch1'), wallId: f.wallId, offset: 200, mark: 'S1' });
    expect(f.model.electroElements[id ?? '']).toMatchObject({
      ifcClass: 'IfcSwitchingDevice',
      category: 'electrical',
      discipline: 'electrical',
      status: 'new',
      variant: { kind: 'main' },
      storeyId: f.storeyId,
      mark: 'S1',
      host: { kind: 'wall', wallId: f.wallId, offset: 200, side: 'ref' },
    });
  });

  it('electro.create s bodem u stěny: bod se promítne na nejbližší líc', () => {
    const f = electroFixture();
    const [id] = f.run('electro.create', {
      typeId: T('socket'),
      wallId: f.wallId,
      point: { x: 2500, y: 400 },
    });
    expect(f.model.electroElements[id ?? '']?.host).toMatchObject({ offset: 2500, side: 'opp' });
  });

  it('odmítne polohu mimo stěnu, chybějící hostitele a rámeček u typu bez slotů', () => {
    const f = electroFixture();
    expect(fail(f, 'electro.create', { typeId: T('socket'), wallId: f.wallId, offset: 7000 })).toMatch(
      /mimo stěnu/,
    );
    expect(fail(f, 'electro.create', { typeId: T('lamp'), point: { x: 0, y: 0 } })).toMatch(/storeyId/);
    expect(fail(f, 'electro.create', { typeId: T('socket'), storeyId: f.storeyId })).toMatch(/wallId|point/);
    const board = { typeId: T('board-main'), wallId: f.wallId, offset: 100, slots: ['socket'] };
    expect(fail(f, 'electro.create', board)).toMatch(/rámeček/);
    expect(fail(f, 'electro.create', { typeId: 'nic', wallId: f.wallId })).toMatch(/neexistuje/);
  });

  it('electro.update: výška null = zpět na výchozí výšku typu; změna typu převezme třídu IFC', () => {
    const f = electroFixture();
    const [id] = f.run('electro.create', {
      typeId: T('socket'),
      wallId: f.wallId,
      offset: 1000,
      height: 1150,
    });
    f.run('electro.update', { elementId: id, height: null, typeId: T('data'), symbol: { size: 5 } });
    const el = f.model.electroElements[id ?? ''];
    expect(el?.height).toBeUndefined();
    expect(el?.ifcClass).toBe('IfcOutlet');
    expect(el?.typeId).toBe(T('data'));
    expect(el?.symbol).toEqual({ size: 5 });
    f.run('electro.update', { elementId: id, offset: 1500, side: 'opp' });
    expect(f.model.electroElements[id ?? '']?.host).toMatchObject({ offset: 1500, side: 'opp' });
  });

  it('electro.move: prvek na stěně jen po líci, volný prvek o celý vektor; electro.delete smaže', () => {
    const f = electroFixture();
    const [a] = f.run('electro.create', { typeId: T('socket'), wallId: f.wallId, offset: 1000 });
    const [b] = f.run('electro.create', {
      typeId: T('smoke'),
      storeyId: f.storeyId,
      point: { x: 1000, y: 2000 },
    });
    f.run('electro.move', { elementIds: [a, b], vector: { x: 300, y: 500 } });
    expect(f.model.electroElements[a ?? '']?.host).toMatchObject({ offset: 1300 });
    expect(f.model.electroElements[b ?? '']?.host).toMatchObject({ point: { x: 1300, y: 2500 } });
    expect(fail(f, 'electro.move', { elementIds: [a], vector: { x: 9000, y: 0 } })).toMatch(/mimo stěnu/);
    f.run('electro.delete', { elementIds: [a, b] });
    expect(f.model.electroElements).toEqual({});
  });
});

describe('koncepce 3 Elektro: příkazy typů (vlastní značky i přes AI)', () => {
  it('kopie typu, úprava výchozí výšky platí pro všechny instance, použitý typ nejde smazat', () => {
    const f = electroFixture();
    const [t] = f.run('electroType.duplicate', { typeId: T('socket'), name: 'Zásuvka koupelna' });
    expect(f.model.electroTypes[t ?? '']?.source).toBeUndefined();
    const [id] = f.run('electro.create', { typeId: t, wallId: f.wallId, offset: 1000, height: 1200 });
    f.run('electroType.update', { typeId: t, defaultHeight: 1200 });
    const r = f.editor.query('electro.list', {});
    expect(r.ok && (r.data as { id: string; heightLabel: string | null }[])[0]).toMatchObject({
      id,
      heightLabel: null,
    });
    expect(fail(f, 'electroType.delete', { typeId: t })).toMatch(/používá 1/);
    f.run('electro.delete', { elementIds: [id] });
    f.run('electroType.delete', { typeId: t });
    expect(f.model.electroTypes[t ?? '']).toBeUndefined();
  });

  it('vlastní značka z tvarů (AI): neúplný tvar se odmítne, platný se nakreslí', () => {
    const f = electroFixture();
    const symbol = { kind: 'shapes', shapes: [{ kind: 'circle', center: { x: 0, y: 0.5 } }] };
    const base = { name: 'Hlásič vody', groupId: 'eg-security', family: 'equipment', defaultHeight: 100 };
    expect(fail(f, 'electroType.create', { ...base, symbol })).toMatch(/chybí r/);
    const ok = { kind: 'shapes', shapes: [{ kind: 'circle', center: { x: 0, y: 0.5 }, r: 0.4 }] };
    const [t] = f.run('electroType.create', { ...base, symbol: ok, ifcClass: 'IfcSensor' });
    expect(f.model.electroTypes[t ?? '']).toMatchObject({ mount: 'wall', defaultHeight: 100 });
    expect(fail(f, 'electroType.create', { ...base, groupId: 'eg-nic', symbol: ok })).toMatch(/Skupina/);
  });
});

describe('základ 9: migrace 36 → 37 (elektro)', () => {
  it('doplní skupiny, knihovnu typů, prázdné prvky a sadu Elektro; stávající data nechá', () => {
    const display = createDefaultDisplay(sequentialIds());
    const out = projectV36toV37({ display, elements: { a: 1 } }) as Record<string, unknown>;
    expect(out['elements']).toEqual({ a: 1 });
    expect(Object.keys(out['electroTypes'] as object).length).toBeGreaterThan(40);
    expect(out['electroElements']).toEqual({});
    const d = out['display'] as typeof display;
    expect(Object.values(d.styles).map((s) => s.name)).toEqual(['Studie', 'Projekt', 'Elektro']);
    const study = Object.values(d.styles)[0];
    const combo = study && d.layerCombinations[study.layerCombinationId];
    expect(combo?.states['layer-electro']).toEqual({ visible: false, locked: false });
    expect(d.layerCombinations['lc-electro']?.states['layer-electro']?.visible).toBe(true);
    expect(projectV36toV37(out)).toEqual(out);
  });
});
