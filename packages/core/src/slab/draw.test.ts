import { describe, expect, it } from 'vitest';
import { fixture, type Fixture } from '../testing/fixture.ts';
import { drawView } from '../view/draw-view.ts';
import { DEFAULT_CUT_HEIGHT } from '../wall/layers.ts';
import { projectV16toV17 } from './migrate-v16.ts';

const typeId = (f: Fixture, name: string) =>
  Object.values(f.model.slabTypes).find((t) => t.name === name)!.id;
const rect = { a: { x: 0, y: 0 }, b: { x: 4000, y: 3000 } };
const slabLines = (f: Fixture) =>
  drawView(f.model, f.viewId).primitives.filter(
    (p) => p.kind === 'line' && p.source.role.startsWith('deska'),
  );

describe('D1: deska v půdorysu', () => {
  it('základ 11: deska pod rovinou řezu = plný obrys perem pohledu z funkce grafiky', () => {
    const f = fixture();
    f.run('slab.create', { storeyId: f.storeyId, typeId: typeId(f, 'ŽB strop 250'), rect });
    const [line] = slabLines(f);
    expect(line?.kind === 'line' && line.stroke).toEqual({ pen: 2, color: '#000000', lineType: 'solid' });
    expect(line?.source.role).toBe('deska pod řezem');
  });

  it('D1: deska nad rovinou řezu čárkovaně, protnutá rovinou řezu perem řezu', () => {
    const f = fixture();
    const t = typeId(f, 'ŽB strop 250');
    f.run('slab.create', { storeyId: f.storeyId, typeId: t, rect, topOffset: 2900 });
    f.run('slab.create', { storeyId: f.storeyId, typeId: t, rect, topOffset: DEFAULT_CUT_HEIGHT + 100 });
    const lines = slabLines(f).map((p) =>
      p.kind === 'line' ? [p.source.role, p.stroke.lineType, p.stroke.pen] : [],
    );
    expect(lines).toContainEqual(['deska nad řezem', 'dashed', 2]);
    expect(lines).toContainEqual(['deska v řezu', 'solid', 5]);
  });

  it('základ 26: skrytá vrstva Desky desku nekreslí; deska jiného podlaží se nekreslí', () => {
    const f = fixture();
    f.run('slab.create', { storeyId: f.storeyId, typeId: typeId(f, 'ŽB strop 250'), rect });
    f.run('view.setLayerState', { viewId: f.viewId, layerId: f.layer('Desky'), visible: false });
    expect(slabLines(f)).toHaveLength(0);
    const g = fixture();
    const [s2] = g.run('storey.create', { name: '2.NP', elevation: 3000, height: 3000 });
    g.run('slab.create', { storeyId: s2, typeId: typeId(g, 'ŽB strop 250'), rect });
    expect(slabLines(g)).toHaveLength(0);
  });
});

describe('základ 9: migrace 16 → 17', () => {
  it('projekt bez desek dostane typy desek z knihovny se skladbou „pro desku“', () => {
    const f = fixture();
    const { slabTypes: _s, ...old } = f.model;
    const out = projectV16toV17({ ...old, schemaVersion: 16 } as unknown as Record<string, unknown>);
    const types = Object.values(out['slabTypes'] as Record<string, { compositionId: string }>);
    expect(types.length).toBe(4);
    const comps = out['compositions'] as Record<
      string,
      { use: { slab: boolean }; layers: { materialId: string }[] }
    >;
    for (const t of types) {
      expect(comps[t.compositionId]?.use.slab).toBe(true);
      for (const l of comps[t.compositionId]!.layers) expect(f.model.materials[l.materialId]).toBeDefined();
    }
  });
});
