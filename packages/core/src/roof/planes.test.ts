import { describe, expect, it } from 'vitest';
import { createCoreRegistry } from '../commands/all.ts';
import { Editor } from '../commands/editor.ts';
import { sequentialIds } from '../ids/index.ts';
import { createEmptyProject } from '../model/create.ts';
import { planeZ, roofGeometry } from './planes.ts';
import { difference, planePolygon, polygonsArea, union } from '../covering/polygon.ts';
import type { Roof } from './types.ts';

const L = [
  { x: 0, y: 0 },
  { x: 12000, y: 0 },
  { x: 12000, y: 6000 },
  { x: 6000, y: 6000 },
  { x: 6000, y: 12000 },
  { x: 0, y: 12000 },
];

function roof(params: Record<string, unknown>, edits: Record<string, unknown>[] = []) {
  const newId = sequentialIds();
  const ed = new Editor(createEmptyProject(newId), { registry: createCoreRegistry(), newId });
  const storeyId = Object.keys(ed.model.storeys)[0] as string;
  const r = ed.execute('roof.create', { storeyId, typeId: 'roof-type-tiles-240', ...params });
  if (!r.ok) throw new Error(r.error.message);
  const id = r.created?.[0] as string;
  for (const e of edits) ed.execute('roof.setEdge', { roofId: id, ...e });
  return roofGeometry(ed.model, ed.model.elements[id] as Roof);
}

/** Každá hrana mezi dvěma rovinami (nároží, úžlabí, hřeben) leží celá v obou rovinách – roviny navazují. */
function expectJoined(g: ReturnType<typeof roofGeometry>) {
  for (const p of g.planes)
    p.polygon.forEach((a, k) => {
      const bd = p.bounds[k];
      if (bd?.kind !== 'plane') return;
      const b = p.polygon[(k + 1) % p.polygon.length]!;
      for (const q of [a, b])
        expect(planeZ(g, bd.plane, q), `rovina ${p.edge} / ${bd.plane}`).toBeCloseTo(q.z, 0);
    });
}

/** Roviny přesně vyplní uzavřený obrys okapu (průsečíky posunutých hran): bez mezer a přesahů. */
function expectCovers(g: ReturnType<typeof roofGeometry>) {
  const n = g.edges.length;
  const eave = g.edges.map((e, i) => {
    const p = g.edges[(i + n - 1) % n]!;
    const det = p.n.x * e.n.y - p.n.y * e.n.x;
    const [kp, ke] = [p.c - p.overhang, e.c - e.overhang];
    return { x: (kp * e.n.y - ke * p.n.y) / det, y: (p.n.x * ke - e.n.x * kp) / det };
  });
  const area = (pts: readonly { x: number; y: number }[]) =>
    pts.reduce((s, a, k) => {
      const b = pts[(k + 1) % pts.length]!;
      return s + (a.x * b.y - b.x * a.y) / 2;
    }, 0);
  const total = g.planes.reduce((s, p) => s + area(p.polygon), 0);
  expect(total / area(eave)).toBeCloseTo(1, 5);
  // Nic nepřečnívá za obrys okapu a nic v něm nechybí (mezera / jazyk v rohu).
  const all = union(
    [],
    g.planes.map((p) => p.polygon),
  );
  expect(polygonsArea(difference(all, [eave]))).toBeLessThan(100);
  expect(
    polygonsArea(
      difference(
        planePolygon(eave),
        g.planes.map((p) => p.polygon),
      ),
    ),
  ).toBeLessThan(100);
  for (const p of g.planes) expect(area(p.polygon)).toBeGreaterThan(0);
}

describe('rozhodnutí 11 / střechy: přesah v rozích', () => {
  it('hlášení uživatele 2026-11-28 / střechy: L se sklony 45° a 30° – roviny v rohu přesahu navazují (vnější i vnitřní roh)', () => {
    const g = roof({ outline: L, slope: 45, overhang: 500 }, [{ indices: [1, 2], slope: 30 }]);
    expect(g.planes).toHaveLength(6);
    expectJoined(g);
    expectCovers(g);
    // Obráceně (30° na hranách 0, 5 – druhý vnější roh a úžlabí z druhé strany).
    const h = roof({ outline: L, slope: 30, overhang: 500 }, [{ indices: [1, 2], slope: 45 }]);
    expectJoined(h);
    expectCovers(h);
  });

  it('hlášení uživatele 2026-11-28 / střechy: různý přesah na sousedních hranách – roh leží na nároží', () => {
    const rect = { a: { x: 0, y: 0 }, b: { x: 10000, y: 6000 } };
    const g = roof({ rect, shape: 'hip', slope: 35, overhang: 500 }, [{ indices: [0], overhang: 900 }]);
    expectJoined(g);
    expectCovers(g);
    const t = roof({ outline: L, slope: 40, overhang: 300 }, [
      { indices: [0], slope: 25, overhang: 800 },
      { indices: [3], slope: 55 },
    ]);
    expectJoined(t);
    expectCovers(t);
    // Stejný sklon i přesah: roh = průsečík okapových čar (jako dřív).
    const same = roof({ rect, shape: 'hip', slope: 35, overhang: 500 });
    expect(same.planes[0]!.polygon[0]).toMatchObject({ x: -500, y: -500 });
  });
});
