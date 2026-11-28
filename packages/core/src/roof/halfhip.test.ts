import { describe, expect, it } from 'vitest';
import { createCoreRegistry } from '../commands/all.ts';
import { Editor } from '../commands/editor.ts';
import { sequentialIds } from '../ids/index.ts';
import { createEmptyProject } from '../model/create.ts';
import type { Vec3 } from '../covering/frame.ts';
import { planeZ, roofGeometry } from './planes.ts';
import { roofSolids } from './solids.ts';
import type { Roof } from './types.ts';

function make(params: Record<string, unknown>) {
  const newId = sequentialIds();
  const ed = new Editor(createEmptyProject(newId), { registry: createCoreRegistry(), newId });
  const storeyId = Object.keys(ed.model.storeys)[0] as string;
  const rect = { a: { x: 0, y: 0 }, b: { x: 10000, y: 6000 } };
  const r = ed.execute('roof.create', {
    storeyId,
    typeId: 'roof-type-tiles-240',
    rect,
    refOffset: 0,
    ...params,
  });
  if (!r.ok) throw new Error(r.error.message);
  const roof = ed.model.elements[r.created?.[0] as string] as Roof;
  return { ed, roof, g: roofGeometry(ed.model, roof) };
}

const near = (a: Vec3, b: Vec3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) < 1;

describe('rozhodnutí 11 / střechy: polovalba', () => {
  it('rozhodnutí 11 / polovalba: předvolba na obdélníku 10 × 6 m, 45° – zlom v polovině výšky hřebene', () => {
    const { roof, g } = make({ shape: 'halfhip', slope: 45, overhang: 0 });
    expect(roof.edges.map((e) => e.kind)).toEqual(['slope', 'halfhip', 'slope', 'halfhip']);
    expect(roof.edges[1]?.breakHeight).toBe(1500);
    // Dvě hlavní roviny + dvě valby nad zlomem; pod zlomem dva štíty (lichoběžník do výšky zlomu).
    expect(g.planes).toHaveLength(4);
    expect(g.gables).toHaveLength(2);
    expect(Math.max(...g.gables[0]!.polygon.map((p) => p.z))).toBeCloseTo(1500, 0);
    const ridge = g.lines.filter((l) => l.kind === 'ridge');
    expect(ridge).toHaveLength(1);
    expect(Math.hypot(ridge[0]!.a.x - ridge[0]!.b.x, ridge[0]!.a.y - ridge[0]!.b.y)).toBeCloseTo(7000, 0);
    expect(ridge[0]!.a.z).toBeCloseTo(3000, 0);
    expect(g.lines.filter((l) => l.kind === 'hip')).toHaveLength(4);
    // Valba polovalby: spodní hrana (okap valby) ve výšce zlomu.
    const hip = g.planes.find((p) => p.edge === 1)!;
    expect(hip.eaveZ).toBeCloseTo(1500, 0);
  });

  it('rozhodnutí 11 / polovalba: s přesahem roviny navazují (nároží valby, štítová hrana) i ve všech vrstvách', () => {
    const { ed, roof, g } = make({ shape: 'halfhip', slope: 40, overhang: 500 });
    for (const p of g.planes)
      p.polygon.forEach((a, k) => {
        const bd = p.bounds[k];
        if (bd?.kind !== 'plane') return;
        const b = p.polygon[(k + 1) % p.polygon.length]!;
        for (const q of [a, b]) expect(planeZ(g, bd.plane, q)).toBeCloseTo(q.z, 0);
      });
    const solids = roofSolids(ed.model, roof, g);
    for (const s of solids) {
      const p = g.planes.find((q) => q.edge === s.plane)!;
      p.bounds.forEach((bd, k) => {
        if (bd.kind !== 'plane') return;
        const other = solids.find((o) => o.plane === bd.plane && o.layer === s.layer)!;
        for (const surf of ['bottom', 'top'] as const)
          for (const q of [s[surf][k]!, s[surf][(k + 1) % p.polygon.length]!])
            expect(other[surf].some((o) => near(o, q))).toBe(true);
      });
    }
  });

  it('rozhodnutí 11 / polovalba: roof.setEdge přepne štít na polovalbu se zadanou výškou zlomu', () => {
    const { ed, roof } = make({ shape: 'gable', slope: 45, overhang: 0 });
    const r = ed.execute('roof.setEdge', {
      roofId: roof.id,
      indices: [1],
      kind: 'halfhip',
      breakHeight: 2000,
    });
    expect(r.ok).toBe(true);
    const g = roofGeometry(ed.model, ed.model.elements[roof.id] as Roof);
    expect(g.planes).toHaveLength(3);
    expect(g.planes.find((p) => p.edge === 1)!.eaveZ).toBeCloseTo(2000, 0);
    const bad = ed.execute('roof.setEdge', {
      roofId: roof.id,
      indices: [3],
      kind: 'halfhip',
      breakHeight: -5,
    });
    expect(bad.ok).toBe(false);
  });
});
