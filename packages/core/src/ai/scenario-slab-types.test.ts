// AI scénář: typy desek v editoru typů – stejné kroky jako uživatel v okně Editor typů → Desky, jen JSON
// volání nástrojů (duplikovat s vlastní skladbou, přejmenovat, upravit vrstvy, smazat).
import { describe, expect, it } from 'vitest';
import { must, start } from './scenario-helpers.ts';

interface SlabTypeRow {
  id: string;
  name: string;
  mark: string;
  thickness: number;
  slabFunction: string;
  layers: { materialId: string; thickness: number }[];
}
interface SlabRow {
  id: string;
  bottom: number;
}

describe('AI scénář: typy desek (editor typů)', () => {
  it('podlaha s dlažbou: kopie typu, vrstva navrch, tlustší anhydrit, deska se přepočítá; smazání kopie', () => {
    const c = start();
    const types = () => c.ai.call<SlabTypeRow[]>('slabType.list');
    const base = must(types().find((t) => t.name === 'Podlaha anhydrit 150'));
    const [id] = c.ai.call<string[]>('slabType.duplicate', { typeId: base.id, ownComposition: true });
    c.ai.call('slabType.update', { typeId: id, name: 'Podlaha dlažba 170', mark: 'P3' });
    const tile = must(base.layers[1]).materialId;
    c.ai.call('slabType.addLayer', {
      typeId: id,
      layer: { materialId: tile, thickness: 10, function: 'finish' },
    });
    c.ai.call('slabType.updateLayer', { typeId: id, layerIndex: 1, thickness: 60 });
    const row = must(types().find((t) => t.id === id));
    expect([row.name, row.mark, row.thickness, row.slabFunction]).toEqual([
      'Podlaha dlažba 170',
      'P3',
      170,
      'floor',
    ]);
    expect(must(types().find((t) => t.id === base.id)).thickness).toBe(150);
    const rect = { a: { x: 0, y: 0 }, b: { x: 3000, y: 3000 } };
    const [slab] = c.ai.call<string[]>('slab.create', { storeyId: c.storeyId, typeId: id, rect });
    expect(must(c.ai.call<SlabRow[]>('slab.list').find((s) => s.id === slab)).bottom).toBe(-170);
    c.ai.call('selection.delete', { slabIds: [slab] });
    c.ai.call('slabType.delete', { typeId: id });
    expect(types().some((t) => t.id === id)).toBe(false);
  });
});
