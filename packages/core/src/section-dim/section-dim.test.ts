import { describe, expect, it } from 'vitest';
import { drawSection } from '../section/draw.ts';
import { fixture, type Fixture } from '../testing/fixture.ts';
import { projectV35toV36 } from './migrate-v35.ts';

const v = (x: number, y: number) => ({ x, y });

/** Strop ŽB 250 v +3,000 nad stěnou a řez napříč. */
function scene(f: Fixture) {
  const wall = f.line(v(0, 0), v(6000, 0));
  const typeId = Object.values(f.model.slabTypes).find((t) => t.name === 'ŽB strop 250')?.id;
  const rect = { a: v(0, -2000), b: v(6000, 2000) };
  const [slab] = f.run('slab.create', { storeyId: f.storeyId, typeId, rect, topOffset: 3000 });
  const [sec] = f.run('section.create', {
    start: v(3000, -3000),
    end: v(3000, 3000),
    styleId: f.style('Projekt'),
  });
  return { wall, slab: slab as string, sec: sec as string };
}

const texts = (f: Fixture, sec: string, id: string) =>
  drawSection(f.model, sec).primitives.flatMap((p) =>
    p.source.dimensionId === id && p.kind === 'text' ? [p.text] : [],
  );

describe('hlášení uživatele 2026-11-27: kóta v řezu', () => {
  it('pravidla-interakce / kóty v řezu: svislá kóta mezi úrovní podlaží a horním lícem stropu, asociativní', () => {
    const f = fixture();
    const { slab, sec } = scene(f);
    const [id] = f.run('sectionDim.create', {
      sectionId: sec,
      a: { kind: 'storey', storeyId: f.storeyId },
      b: { kind: 'edge', elementId: slab, edge: 'top' },
      offset: -500,
    });
    expect(texts(f, sec, id as string)).toEqual(['3000']);
    f.run('slab.update', { slabIds: [slab], topOffset: 2800 });
    expect(texts(f, sec, id as string)).toEqual(['2800']);
    const line = drawSection(f.model, sec).primitives.find(
      (p) => p.source.dimensionId === id && p.source.role === 'kótovací čára',
    );
    expect(line?.kind === 'line' && line.stroke.pen).toBe(1);
  });

  it('pravidla-interakce / kóty v řezu: vodorovná kóta mezi boky stěny = tloušťka stěny v řezu', () => {
    const f = fixture();
    const { wall, sec } = scene(f);
    const [id] = f.run('sectionDim.create', {
      sectionId: sec,
      a: { kind: 'side', elementId: wall, side: 'left' },
      b: { kind: 'side', elementId: wall, side: 'right' },
      offset: 3500,
    });
    expect(texts(f, sec, id as string)).toEqual(['300']);
    expect(
      f.editor.execute('sectionDim.create', {
        sectionId: sec,
        a: { kind: 'side', elementId: wall, side: 'left' },
        b: { kind: 'storey', storeyId: f.storeyId },
        offset: 0,
      }).ok,
    ).toBe(false);
  });

  it('základ 28 / 7: zamčená kóta se neposune; Del i smazání řezu ji smaže', () => {
    const f = fixture();
    const { slab, sec } = scene(f);
    const a = { kind: 'storey', storeyId: f.storeyId };
    const b = { kind: 'edge', elementId: slab, edge: 'bottom' };
    const [id] = f.run('sectionDim.create', { sectionId: sec, a, b, offset: 0 });
    f.run('sectionDim.update', { dimId: id, locked: true });
    expect(f.editor.execute('sectionDim.update', { dimId: id, offset: 100 }).ok).toBe(false);
    f.run('selection.delete', { levelDimIds: [id] });
    expect(f.model.sectionDims).toEqual({});
    f.run('sectionDim.create', { sectionId: sec, a, b, offset: 0 });
    f.run('section.delete', { sectionId: sec });
    expect(f.model.sectionDims).toEqual({});
  });

  it('základ 9: migrace 35 → 36 přidá prázdné kóty v řezech', () => {
    expect(projectV35toV36({})).toEqual({ sectionDims: {} });
  });
});
