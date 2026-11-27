import { describe, expect, it } from 'vitest';
import { slabLevels, vec, wallHeight, type Slab } from '@bim-light/core';
import { fixture } from '../../../../packages/core/src/testing/fixture.ts';
import { wallSolids } from './solids.ts';
import { slabSolids } from './slab-solids.ts';

describe('3D náhled / uložení stropu (priorita materiálů, stejné pravidlo jako řez)', () => {
  it('priorita materiálů / 3D: zdivo pod stropem končí na jeho spodním líci, zateplení jde přes čelo souvisle', () => {
    const f = fixture();
    const wall = f.line(vec(0, 0), vec(6000, 0), { typeId: f.type('Obvodová zateplená 465') });
    const typeId = Object.values(f.model.slabTypes).find((t) => t.name === 'ŽB strop 250')?.id;
    const top = wallHeight(f.model, f.wall(wall)).top;
    const [id] = f.run('slab.create', {
      storeyId: f.storeyId,
      typeId,
      rect: { a: vec(-1000, -2000), b: vec(7000, 2000) },
      topOffset: top,
    });
    const slab = f.model.elements[id as string] as Slab;
    const lv = slabLevels(f.model, slab);
    const solids = wallSolids(f.model, f.wall(wall));
    const mat = (key: string) => Object.values(f.model.materials).find((m) => m.source?.itemId === key)?.id;
    const zdivo = solids.filter((s) => s.materialId === mat('masonry-ceramic')).flatMap((s) => s.slabs);
    expect(zdivo.every((b) => b.z1 <= lv.bottom + 1e-6 || b.z0 >= lv.top - 1e-6)).toBe(true);
    const ins = solids.filter((s) => s.materialId === mat('insulation-eps')).flatMap((s) => s.slabs);
    expect(Math.max(...ins.map((b) => b.z1))).toBeGreaterThanOrEqual(lv.top - 1e-6);
    expect(slabSolids(f.model, slab).length).toBeGreaterThan(0);
  });
});
