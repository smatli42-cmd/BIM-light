import { describe, expect, it } from 'vitest';
import type { PlanePolygon } from '../covering/polygon.ts';
import { wallQuantities } from '../schedule/quantities.ts';
import { slabCut, wallCut } from '../section/cut.ts';
import { sectionFrame } from '../section/frame.ts';
import { slabLevels } from '../slab/geometry.ts';
import type { Slab } from '../slab/types.ts';
import { fixture, type Fixture } from '../testing/fixture.ts';
import { wallGeometry } from '../wall/geometry.ts';
import { wallHeight } from '../wall-height/resolve.ts';

const v = (x: number, y: number) => ({ x, y });
const frame = sectionFrame({ points: [v(3000, -3000), v(3000, 3000)], direction: 'left', depth: null });

const bounds = (shapes: readonly PlanePolygon[]) => {
  const pts = shapes.flatMap((p) => p.outer);
  return {
    u0: Math.min(...pts.map((p) => p.x)),
    u1: Math.max(...pts.map((p) => p.x)),
    z0: Math.min(...pts.map((p) => p.y)),
    z1: Math.max(...pts.map((p) => p.y)),
  };
};

const material = (f: Fixture, key: string) =>
  Object.values(f.model.materials).find((m) => m.source?.itemId === key)?.id as string;

/** Obvodová zateplená stěna podél osy x a ŽB strop přes celý půdorys (i přes zateplení). */
function scene(f: Fixture, slabType = 'ŽB strop 250') {
  const wall = f.line(v(0, 0), v(6000, 0), { typeId: f.type('Obvodová zateplená 465') });
  const typeId = Object.values(f.model.slabTypes).find((t) => t.name === slabType)?.id;
  const top = wallHeight(f.model, f.wall(wall)).top;
  const rect = { a: v(-1000, -2000), b: v(7000, 2000) };
  const [slab] = f.run('slab.create', { storeyId: f.storeyId, typeId, rect, topOffset: top });
  const s = f.model.elements[slab as string] as Slab;
  return { wall, slab: s, lv: slabLevels(f.model, s) };
}

describe('napojení desky na stěnu podle priority materiálů (Archicad priorita průniku, Revit k jádru)', () => {
  it('priorita materiálů / uložení stropu: ŽB deska prořízne zdivo a vnitřní omítku ve své výšce, zateplení ne', () => {
    const f = fixture();
    const { wall, lv } = scene(f);
    const pieces = wallCut(f.model, f.wall(wall), frame, null);
    const of = (key: string) => pieces.filter((p) => p.materialId === material(f, key));
    // Zdivo: žádný kus v rozsahu desky (kus pod deskou končí na jejím spodním líci).
    for (const p of [...of('masonry-ceramic'), ...of('plaster')]) {
      const b = bounds(p.shapes);
      expect(b.z1 <= lv.bottom + 1e-6 || b.z0 >= lv.top - 1e-6).toBe(true);
    }
    // Zateplení jde přes čelo desky souvisle.
    expect(Math.max(...of('insulation-eps').map((p) => bounds(p.shapes).z1))).toBeGreaterThanOrEqual(
      lv.top - 1e-6,
    );
  });

  it('priorita materiálů / k jádru: deska končí na vnějším líci nosného jádra, zateplení ji ořízne', () => {
    const f = fixture();
    const { wall, slab } = scene(f);
    const g = wallGeometry(f.model, f.wall(wall));
    const ins = g.layers.find((l) => l.span.layer.materialId === material(f, 'insulation-eps'));
    const insBounds = bounds((ins?.polygons ?? []).map((p) => ({ outer: p, holes: [] })));
    const insU = [insBounds.z0, insBounds.z1].map((y) => y + 3000); // u = y + 3000 (řez podél osy y od −3000)
    const slabPieces = slabCut(f.model, slab, frame, null);
    for (const p of slabPieces) {
      const b = bounds(p.shapes);
      // Žádný kus desky neleží v pásu zateplení.
      expect(b.u1 <= Math.min(...insU) + 1e-6 || b.u0 >= Math.max(...insU) - 1e-6).toBe(true);
    }
  });

  it('priorita materiálů: podlaha (skladba podlahy) do stěny nezasahuje – stěna ji ořízne a zůstane celá', () => {
    const f = fixture();
    const { wall, lv } = scene(f, 'Podlaha anhydrit 150');
    const core = wallCut(f.model, f.wall(wall), frame, null).filter(
      (p) => p.materialId === material(f, 'masonry-ceramic'),
    );
    expect(
      core.some((p) => bounds(p.shapes).z1 >= lv.top - 1e-6 && bounds(p.shapes).z0 <= lv.bottom + 1e-6),
    ).toBe(true);
  });

  it('základ 7 / výkazy: objem zdiva stěny se zmenší o uložený strop (bez dvojího započtení)', () => {
    const f = fixture();
    const wall = f.line(v(0, 0), v(6000, 0), { typeId: f.type('Obvodová zateplená 465') });
    const before = wallQuantities(f.model, f.wall(wall), 0).volume;
    const typeId = Object.values(f.model.slabTypes).find((t) => t.name === 'ŽB strop 250')?.id;
    const top = wallHeight(f.model, f.wall(wall)).top;
    f.run('slab.create', {
      storeyId: f.storeyId,
      typeId,
      rect: { a: v(-1000, -2000), b: v(7000, 2000) },
      topOffset: top,
    });
    expect(wallQuantities(f.model, f.wall(wall), 0).volume).toBeLessThan(before);
  });

  it('priorita materiálů: vnitřní nosná stěna pod stropem po obou stranách – deska prořízne jádro i obě omítky', () => {
    const f = fixture();
    const wall = f.line(v(0, 0), v(6000, 0), { typeId: f.type('Nosná zeď 330') });
    const typeId = Object.values(f.model.slabTypes).find((t) => t.name === 'ŽB strop 250')?.id;
    const top = wallHeight(f.model, f.wall(wall)).top;
    const [id] = f.run('slab.create', {
      storeyId: f.storeyId,
      typeId,
      rect: { a: v(-1000, -2000), b: v(7000, 2000) },
      topOffset: top,
    });
    const lv = slabLevels(f.model, f.model.elements[id as string] as Slab);
    for (const p of wallCut(f.model, f.wall(wall), frame, null)) {
      const b = bounds(p.shapes);
      expect(b.z1 <= lv.bottom + 1e-6).toBe(true);
    }
  });
});
