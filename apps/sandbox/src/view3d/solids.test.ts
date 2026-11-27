import { describe, expect, it } from 'vitest';
import {
  buildSample,
  findSample,
  sequentialIds,
  vec,
  wallHeight,
  type Model,
  type View,
} from '@bim-light/core';
import { fixture, type Fixture } from '../../../../packages/core/src/testing/fixture.ts';
import { modelSolids, selectionElements } from './scene-model.ts';
import { sliceLayer, shapeArea } from './slice.ts';
import { wallSolids, type Solid } from './solids.ts';

const volume = (solids: readonly Solid[]) =>
  solids.reduce((v, s) => v + s.slabs.reduce((a, b) => a + shapeArea(b.shape) * (b.z1 - b.z0), 0), 0);

const view = (f: Fixture): View => f.model.views[f.viewId] as View;
const wallOf = (m: Model, id: string) => m.elements[id] as Parameters<typeof wallSolids>[1];
const phase = (f: Fixture, name: string) =>
  Object.values(f.model.display.overrideCombinations).find((c) => c.phase && c.name === name)!.id;

describe('3D náhled / tělesa stěn: výška a otvory z modelu', () => {
  it('3D náhled / pásy: otvor rozdělí vrstvu na tři pásy, prostřední s výřezem', () => {
    const rect = [vec(0, 0), vec(1000, 0), vec(1000, 300), vec(0, 300)];
    const hole = [vec(200, -1), vec(800, -1), vec(800, 301), vec(200, 301)];
    const slabs = sliceLayer([rect], 0, 3000, [{ footprint: hole, bottom: 900, top: 2400 }]);
    expect(slabs.map((s) => [s.z0, s.z1])).toEqual([
      [0, 900],
      [900, 2400],
      [2400, 3000],
    ]);
    expect(shapeArea(slabs[0]!.shape)).toBeCloseTo(300_000);
    expect(shapeArea(slabs[1]!.shape)).toBeCloseTo(400 * 300);
  });

  it('3D náhled / výška: stěna sahá od spodku do vršku podle vazby na podlaží', () => {
    const f = fixture();
    const id = f.line(vec(0, 0), vec(5000, 0));
    const h = wallHeight(f.model, f.wall(id));
    const solids = wallSolids(f.model, f.wall(id));
    const zs = solids.flatMap((s) => s.slabs.flatMap((b) => [b.z0, b.z1]));
    expect(Math.min(...zs)).toBe(h.bottom);
    expect(Math.max(...zs)).toBe(h.top);
    expect(volume(solids)).toBeCloseTo(5000 * 300 * h.height, -3);
  });

  it('3D náhled / otvor: průchozí otvor ubere objem šířka × výška × tloušťka, nika jen do hloubky', () => {
    const f = fixture();
    const id = f.line(vec(0, 0), vec(6000, 0));
    const full = volume(wallSolids(f.model, f.wall(id)));
    f.run('opening.create', { wallId: id, offset: 1000, width: 1200, height: 1500, sill: 900 });
    const withHole = volume(wallSolids(f.model, f.wall(id)));
    expect(full - withHole).toBeCloseTo(1200 * 1500 * 300, -3);
    f.run('opening.create', { wallId: id, offset: 4000, width: 600, kind: 'niche', depth: 100 });
    const o = Object.values(f.model.openings).find((x) => x.kind === 'niche')!;
    const withNiche = volume(wallSolids(f.model, f.wall(id)));
    expect(withHole - withNiche).toBeCloseTo(600 * o.height * 100, -3);
  });

  it('3D náhled / oblouk: objem = délka střednice × tloušťka × výška', () => {
    const f = fixture();
    const path = { kind: 'arc', start: vec(0, 0), end: vec(4000, 0), bulge: 0.5 };
    const [id] = f.run('wall.create', { storeyId: f.storeyId, typeId: f.type('Zdivo 300'), path });
    const solids = wallSolids(f.model, f.wall(id!));
    const h = wallHeight(f.model, f.wall(id!)).height;
    // Tětiva 4000, bulge 0,5 → poloměr 2500, úhel 2·asin(0,8); referenční čára je líc, střednice
    // leží o půl tloušťky blíž ke středu.
    const arcLen = (2500 - 150) * 2 * Math.asin(0.8);
    expect(volume(solids) / (300 * h)).toBeCloseTo(arcLen, -1);
  });

  it('3D náhled / materiál: každá vrstva skladby je těleso s barvou svého materiálu', () => {
    const f = fixture();
    const id = f.line(vec(0, 0), vec(5000, 0), { typeId: f.type('Obvodová zateplená 465') });
    const solids = wallSolids(f.model, f.wall(id));
    const type = f.model.wallTypes[f.type('Obvodová zateplená 465')]!;
    expect(solids).toHaveLength(type.bands[0]!.layers.length);
    for (const s of solids) expect(s.color).toBe(f.model.materials[s.materialId!]!.color);
  });
});

describe('3D náhled / co je vidět: filtr rekonstrukce a vrstvy aktivního pohledu', () => {
  it('3D náhled / filtr: bouraná stěna v plánovaném stavu chybí, bez filtru je vidět', () => {
    const f = fixture();
    const keep = f.line(vec(0, 0), vec(5000, 0));
    const old = f.line(vec(0, 3000), vec(5000, 3000));
    f.run('wall.setProperties', { wallIds: [old], status: 'demolished' });
    const ids = () => new Set(modelSolids(f.model, view(f)).map((s) => s.elementId));
    expect(ids()).toEqual(new Set([keep, old]));
    f.run('view.setPhaseFilter', { viewId: f.viewId, filterId: phase(f, 'Fáze – plánovaný stav') });
    expect(ids()).toEqual(new Set([keep]));
  });

  it('3D náhled / vrstvy: skryté vrstvy pohledu skryjí stěny i ve 3D', () => {
    const f = fixture();
    f.line(vec(0, 0), vec(5000, 0));
    for (const layerId of Object.keys(f.model.display.layers))
      f.run('view.setLayerState', { viewId: f.viewId, layerId, visible: false });
    expect(modelSolids(f.model, view(f))).toHaveLength(0);
  });

  it('3D náhled / všechna podlaží: Zobrazit vše ukáže stěny všech podlaží, F4 jen vybrané', () => {
    const f = fixture();
    const a = f.line(vec(0, 0), vec(5000, 0));
    const [st2] = f.run('storey.create', { name: '2.NP', elevation: 3000, height: 3000 });
    const [b] = f.run('wall.create', {
      storeyId: st2,
      typeId: f.type('Zdivo 300'),
      path: { kind: 'line', start: vec(0, 0), end: vec(5000, 0) },
    });
    const all = modelSolids(f.model, view(f));
    expect(new Set(all.map((s) => s.elementId))).toEqual(new Set([a, b]));
    const zb = all.find((s) => s.elementId === b)!.slabs[0]!.z0;
    expect(zb).toBe(wallHeight(f.model, wallOf(f.model, b!)).bottom);
    const only = modelSolids(f.model, view(f), new Set([b!]));
    expect(new Set(only.map((s) => s.elementId))).toEqual(new Set([b]));
  });

  it('3D náhled / F4: vybraný otvor ukáže svou hostitelskou stěnu', () => {
    const f = fixture();
    const id = f.line(vec(0, 0), vec(5000, 0));
    const [o] = f.run('opening.create', { wallId: id, offset: 1000, width: 900 });
    expect(selectionElements(f.model, [], [o!])).toEqual(new Set([id]));
  });
});

describe('3D náhled / ukázkový dům', () => {
  it('3D náhled / ukázka dum: obě podlaží mají tělesa, otvory jsou vyříznuté', () => {
    const m = buildSample(findSample('dum')!, sequentialIds());
    const v = Object.values(m.views)[0]!;
    const solids = modelSolids(m, v);
    const storeys = new Set(solids.map((s) => (m.elements[s.elementId] as { storeyId: string }).storeyId));
    expect(storeys.size).toBe(Object.keys(m.storeys).length);
    const hosts = new Set(Object.values(m.openings).map((o) => o.hostId));
    const cut = solids.filter((s) => hosts.has(s.elementId) && s.slabs.length > 1);
    expect(cut.length).toBeGreaterThan(0);
  });
});
