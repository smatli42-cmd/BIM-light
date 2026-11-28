// AI scénář střechy (rozhodnutí 11, S1): valbová, sedlová se štíty, L s úžlabím a různé sklony jen JSON
// voláními nástrojů; roviny a hrany z dotazu roof.planes (stejný výpočet jako kresba a 3D).
import { describe, expect, it } from 'vitest';
import { must, start } from './scenario-helpers.ts';

interface TypeRow {
  id: string;
  name: string;
  layers: { thickness: number; function: string }[];
}
interface RoofRow {
  id: string;
  refLevel: number;
  eaveLevel: number;
  ridgeLevel: number;
  thickness: number;
  belowReference: number;
  planes: number;
  edges: { kind: string; slope: number; overhang: number }[];
}
interface Planes {
  planes: { edge: number; eaveZ: number; polygon: { z: number }[] }[];
  lines: { kind: string; length: number }[];
}

const tan = (deg: number) => Math.tan((deg * Math.PI) / 180);

function setup() {
  const c = start();
  const types = c.ai.call<TypeRow[]>('roofType.list');
  const t = must(types.find((x) => x.name === 'Šikmá střecha, pálená krytina'));
  return { ...c, typeId: t.id, types };
}

describe('AI scénář: střechy (rozhodnutí 11, S1)', () => {
  it('rozhodnutí 11 / střechy: valbová 10 × 6 m – 4 roviny, hřeben 4 m, okap = ref − přesah × tg', () => {
    const c = setup();
    const rect = { a: { x: 0, y: 0 }, b: { x: 10000, y: 6000 } };
    const [id] = c.ai.call<string[]>('roof.create', {
      storeyId: c.storeyId,
      typeId: c.typeId,
      rect,
      shape: 'hip',
      slope: 45,
      overhang: 500,
      refOffset: 3000,
    });
    const r = must(c.ai.call<RoofRow[]>('roof.list').find((x) => x.id === id));
    expect([r.refLevel, r.eaveLevel, r.ridgeLevel, r.planes]).toEqual([3000, 2500, 6000, 4]);
    expect([r.thickness, r.belowReference]).toEqual([325, 14]);
    const p = c.ai.call<Planes>('roof.planes', { roofId: id });
    const ridge = p.lines.filter((l) => l.kind === 'ridge');
    expect(ridge.map((l) => l.length)).toEqual([4000]);
    expect(p.lines.filter((l) => l.kind === 'hip')).toHaveLength(4);
    expect(p.lines.filter((l) => l.kind === 'eave')).toHaveLength(4);
  });

  it('rozhodnutí 11 / střechy: sedlová se štíty, přepnutí hrany na valbu a změna sklonu', () => {
    const c = setup();
    const rect = { a: { x: 0, y: 0 }, b: { x: 10000, y: 6000 } };
    const [id] = c.ai.call<string[]>('roof.create', {
      storeyId: c.storeyId,
      typeId: c.typeId,
      rect,
      shape: 'gable',
      slope: 40,
      overhang: 600,
    });
    const roofId = must(id);
    let p = c.ai.call<Planes>('roof.planes', { roofId });
    expect(p.planes).toHaveLength(2);
    expect(p.lines.filter((l) => l.kind === 'ridge').map((l) => l.length)).toEqual([11200]);
    expect(p.lines.filter((l) => l.kind === 'gable')).toHaveLength(4);
    c.ai.call('roof.setEdge', { roofId, indices: [1], kind: 'slope' });
    p = c.ai.call<Planes>('roof.planes', { roofId });
    expect(p.planes).toHaveLength(3);
    expect(p.lines.filter((l) => l.kind === 'hip')).toHaveLength(2);
    c.ai.call('roof.update', { roofIds: [roofId], slope: 30, eaveLevel: 2700 });
    const r = must(c.ai.call<RoofRow[]>('roof.list').find((x) => x.id === roofId));
    expect(r.eaveLevel).toBeCloseTo(2700, 0);
    expect(r.edges.filter((e) => e.kind === 'slope').every((e) => e.slope === 30)).toBe(true);
    expect(r.refLevel).toBeCloseTo(2700 + 600 * tan(30), 0);
  });

  it('rozhodnutí 11 / střechy: L s úžlabím, různé sklony, posun, kopie a smazání', () => {
    const c = setup();
    const outline = [
      { x: 0, y: 0 },
      { x: 12000, y: 0 },
      { x: 12000, y: 6000 },
      { x: 6000, y: 6000 },
      { x: 6000, y: 12000 },
      { x: 0, y: 12000 },
    ];
    const [id] = c.ai.call<string[]>('roof.create', {
      storeyId: c.storeyId,
      typeId: c.typeId,
      outline,
      slope: 35,
    });
    const roofId = must(id);
    const p = c.ai.call<Planes>('roof.planes', { roofId });
    expect(p.planes).toHaveLength(6);
    expect(p.lines.filter((l) => l.kind === 'valley')).toHaveLength(1);
    c.ai.call('roof.setEdge', { roofId, indices: [0, 5], slope: 45 });
    const q = c.ai.call<Planes>('roof.planes', { roofId });
    const p0 = must(q.planes.find((x) => x.edge === 0));
    expect(p0.eaveZ).toBeCloseTo(3000 - 500 * tan(45), 0);
    // S2: úchop bodu obrysu = roof.moveVertex; vnitřní roh L posunutý ven – pořád jedno úžlabí.
    c.ai.call('roof.moveVertex', { roofId, index: 3, point: { x: 7000, y: 7000 } });
    const moved = c.ai.call<Planes>('roof.planes', { roofId });
    expect(moved.lines.filter((l) => l.kind === 'valley')).toHaveLength(1);
    const square = [
      { x: 0, y: 0 },
      { x: 8000, y: 0 },
      { x: 8000, y: 8000 },
      { x: 0, y: 8000 },
    ];
    const edges = square.map(() => ({ kind: 'slope', slope: 40, overhang: 400 }));
    c.ai.call('roof.setOutline', { roofId, outline: square, edges });
    expect(c.ai.call<Planes>('roof.planes', { roofId }).planes).toHaveLength(4);
    const [copy] = c.ai.call<string[]>('roof.move', {
      roofIds: [roofId],
      vector: { x: 20000, y: 0 },
      copy: true,
    });
    expect(c.ai.call<RoofRow[]>('roof.list')).toHaveLength(2);
    c.ai.call('selection.delete', { roofIds: [roofId, must(copy)] });
    expect(c.ai.call<RoofRow[]>('roof.list')).toHaveLength(0);
  });

  it('rozhodnutí 11 / střechy: chybné zadání se odmítne s důvodem', () => {
    const c = setup();
    const rect = { a: { x: 0, y: 0 }, b: { x: 8000, y: 5000 } };
    const flat = c.ai.raw('roof.create', { storeyId: c.storeyId, typeId: c.typeId, rect, slope: 0 });
    expect(flat.error?.message).toMatch(/Sklon/);
    const [id] = c.ai.call<string[]>('roof.create', {
      storeyId: c.storeyId,
      typeId: c.typeId,
      rect,
      shape: 'shed',
    });
    const all = c.ai.raw('roof.setEdge', { roofId: id, indices: [0], kind: 'gable' });
    expect(all.error?.message).toMatch(/sklon/);
  });
});
