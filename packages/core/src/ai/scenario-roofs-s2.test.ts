// AI scénář střech S2 (pokyn uživatele 2026-11-28): střecha podle obrysu budovy, polovalba a posun hrany
// obrysu – jen JSON voláními nástrojů, stejný výsledek jako myší v sandboxu.
import { describe, expect, it } from 'vitest';
import { must, room, start } from './scenario-helpers.ts';

interface RoofRow {
  id: string;
  outline: { x: number; y: number }[];
  refOffset: number;
  planes: number;
  edges: { kind: string; breakHeight?: number }[];
}
interface Planes {
  planes: { edge: number; eaveZ: number }[];
  lines: { kind: string; length: number }[];
  gables: { edge: number }[];
}

function setup() {
  const c = start();
  const types = c.ai.call<{ id: string; mark: string }[]>('roofType.list');
  return { ...c, roofType: must(types.find((t) => t.mark === 'R1')).id };
}

const box = (pts: { x: number; y: number }[]) => ({
  x0: Math.min(...pts.map((p) => p.x)),
  x1: Math.max(...pts.map((p) => p.x)),
  y0: Math.min(...pts.map((p) => p.y)),
  y1: Math.max(...pts.map((p) => p.y)),
});

describe('AI scénář: střechy S2 (obrys budovy, polovalba, posun hrany)', () => {
  it('S2 / obrys budovy: bod uvnitř místnosti – ref. čára po vnějším líci jádra stěn, výška z vršku stěn', () => {
    const c = setup();
    room(c); // vnitřní líc 6000 × 4000, Zdivo 300 (celé jádro) ven
    const [id] = c.ai.call<string[]>('roof.create', {
      storeyId: c.storeyId,
      typeId: c.roofType,
      fromWalls: { point: { x: 3000, y: 2000 } },
      shape: 'hip',
    });
    const r = must(c.ai.call<RoofRow[]>('roof.list').find((x) => x.id === id));
    expect(r.outline).toHaveLength(4);
    expect(box(r.outline)).toEqual({ x0: -300, x1: 6300, y0: -300, y1: 4300 });
    expect(r.refOffset).toBe(3000);
    // Bod mimo budovu = odmítnutí s důvodem.
    const out = c.ai.raw('roof.create', {
      storeyId: c.storeyId,
      typeId: c.roofType,
      fromWalls: { point: { x: 20000, y: 20000 } },
    });
    expect(out.error?.message).toMatch(/obrys budovy/);
  });

  it('S2 / polovalba: předvolba polovalbová a změna výšky zlomu příkazem roof.setEdge', () => {
    const c = setup();
    const rect = { a: { x: 0, y: 0 }, b: { x: 10000, y: 6000 } };
    const [id] = c.ai.call<string[]>('roof.create', {
      storeyId: c.storeyId,
      typeId: c.roofType,
      rect,
      shape: 'halfhip',
      slope: 45,
      overhang: 0,
      refOffset: 0,
    });
    const roofId = must(id);
    let p = c.ai.call<Planes>('roof.planes', { roofId });
    expect(p.planes).toHaveLength(4);
    expect(p.gables).toHaveLength(2);
    c.ai.call('roof.setEdge', { roofId, indices: [1, 3], breakHeight: 2400 });
    p = c.ai.call<Planes>('roof.planes', { roofId });
    expect(must(p.planes.find((x) => x.edge === 1)).eaveZ).toBeCloseTo(2400, 0);
    expect(p.lines.filter((l) => l.kind === 'ridge').map((l) => Math.round(l.length))).toEqual([8800]);
  });

  it('S2 / posun hrany: roof.moveEdge posune hranu rovnoběžně, sousední hrany se prodlouží', () => {
    const c = setup();
    const rect = { a: { x: 0, y: 0 }, b: { x: 8000, y: 5000 } };
    const [id] = c.ai.call<string[]>('roof.create', { storeyId: c.storeyId, typeId: c.roofType, rect });
    const roofId = must(id);
    c.ai.call('roof.moveEdge', { roofId, index: 1, distance: 1500 });
    let r = must(c.ai.call<RoofRow[]>('roof.list').find((x) => x.id === roofId));
    expect(box(r.outline)).toEqual({ x0: 0, x1: 9500, y0: 0, y1: 5000 });
    c.ai.call('roof.moveEdge', { roofId, index: 2, distance: -1000 });
    r = must(c.ai.call<RoofRow[]>('roof.list').find((x) => x.id === roofId));
    expect(box(r.outline)).toEqual({ x0: 0, x1: 9500, y0: 0, y1: 4000 });
    expect(r.planes).toBe(4);
  });
});
