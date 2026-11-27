import { describe, expect, it } from 'vitest';
import { slabLevels } from '../../slab/geometry.ts';
import { getSlab } from '../../slab/queries.ts';
import { fixture, type Fixture } from '../../testing/fixture.ts';

const typeId = (f: Fixture, name: string) =>
  Object.values(f.model.slabTypes).find((t) => t.name === name)!.id;
const layers = (f: Fixture, id: string) => f.model.compositions[f.model.slabTypes[id]!.compositionId]!.layers;
const tryRun = (f: Fixture, name: string, params: unknown) => f.editor.execute(name, params);
const rect = { a: { x: 0, y: 0 }, b: { x: 4000, y: 3000 } };

describe('koncepce rozhraní 11a / editor typů desek: vrstvy skladby desky', () => {
  it('editor typů desek: úprava tloušťky vrstvy přepočítá desku, horní líc zůstane', () => {
    const f = fixture();
    const t = typeId(f, 'Podlaha anhydrit 150');
    const [s] = f.run('slab.create', { storeyId: f.storeyId, typeId: t, rect });
    f.run('slabType.updateLayer', { typeId: t, layerIndex: 1, thickness: 70 });
    expect(slabLevels(f.model, getSlab(f.model, s!))).toEqual({ top: 0, bottom: -170, thickness: 170 });
    f.editor.undo();
    expect(slabLevels(f.model, getSlab(f.model, s!)).thickness).toBe(150);
  });

  it('editor typů desek: přidat navrch, přesunout, změnit materiál, smazat (vrstvy odspodu)', () => {
    const f = fixture();
    const t = typeId(f, 'Podlaha anhydrit 150');
    const tile = Object.values(f.model.materials)[0]!.id;
    f.run('slabType.addLayer', { typeId: t, layer: { materialId: tile, thickness: 10, function: 'finish' } });
    expect(layers(f, t).map((l) => l.thickness)).toEqual([100, 50, 10]);
    f.run('slabType.moveLayer', { typeId: t, from: 2, to: 0 });
    expect(layers(f, t).map((l) => l.thickness)).toEqual([10, 100, 50]);
    f.run('slabType.updateLayer', { typeId: t, layerIndex: 0, materialId: tile, function: 'insulation' });
    expect(layers(f, t)[0]).toMatchObject({ materialId: tile, function: 'insulation' });
    f.run('slabType.removeLayer', { typeId: t, layerIndex: 0 });
    expect(layers(f, t).map((l) => l.thickness)).toEqual([100, 50]);
  });

  it('editor typů desek: poslední vrstvu, nulovou tloušťku ani neznámý materiál nejde', () => {
    const f = fixture();
    const t = typeId(f, 'ŽB strop 250');
    expect(tryRun(f, 'slabType.updateLayer', { typeId: t, layerIndex: 0, thickness: 0 }).ok).toBe(false);
    expect(tryRun(f, 'slabType.updateLayer', { typeId: t, layerIndex: 0, materialId: 'nic' }).ok).toBe(false);
    expect(tryRun(f, 'slabType.removeLayer', { typeId: t, layerIndex: 5 }).ok).toBe(false);
    f.run('slabType.removeLayer', { typeId: t, layerIndex: 0 });
    expect(tryRun(f, 'slabType.removeLayer', { typeId: t, layerIndex: 0 }).ok).toBe(false);
  });

  it('editor typů desek: Duplikovat s vlastní skladbou – úprava kopie nemění původní typ', () => {
    const f = fixture();
    const t = typeId(f, 'ŽB strop 250');
    const [shared] = f.run('slabType.duplicate', { typeId: t });
    expect(f.model.slabTypes[shared!]!.compositionId).toBe(f.model.slabTypes[t]!.compositionId);
    const [own] = f.run('slabType.duplicate', { typeId: t, name: 'ŽB strop 200', ownComposition: true });
    const copy = f.model.slabTypes[own!]!;
    expect(copy.compositionId).not.toBe(f.model.slabTypes[t]!.compositionId);
    expect(f.model.compositions[copy.compositionId]).toMatchObject({
      name: 'ŽB strop 200',
      use: { slab: true },
    });
    f.run('slabType.updateLayer', { typeId: own, layerIndex: 1, thickness: 200 });
    expect(layers(f, t)[1]!.thickness).toBe(250);
    expect(layers(f, own!)[1]!.thickness).toBe(200);
  });
});
