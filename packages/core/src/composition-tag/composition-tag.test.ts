import { describe, expect, it } from 'vitest';
import { drawSection } from '../section/draw.ts';
import { fixture, type Fixture } from '../testing/fixture.ts';
import { projectV38toV39 } from './migrate-v38.ts';

const v = (x: number, y: number) => ({ x, y });

/** Obvodová zateplená stěna, podlaha anhydrit na ±0 a řez napříč stěnou i podlahou. */
function scene(f: Fixture) {
  const wall = f.line(v(0, 0), v(6000, 0), { typeId: f.type('Obvodová zateplená 465') });
  const floor = Object.values(f.model.slabTypes).find((t) => t.name === 'Podlaha anhydrit 150');
  const [slab] = f.run('slab.create', {
    storeyId: f.storeyId,
    typeId: floor?.id,
    rect: { a: v(0, 300), b: v(6000, 4000) },
    topOffset: 0,
  });
  const [sec] = f.run('section.create', {
    start: v(3000, -3000),
    end: v(3000, 4000),
    styleId: f.style('Projekt'),
  });
  return { wall, slab: slab as string, sec: sec as string, floorType: floor?.id as string };
}

function q<T>(f: Fixture, name: string, params: unknown): T {
  const r = f.editor.query(name, params);
  if (!r.ok) throw new Error(r.error.message);
  return r.data as T;
}

const texts = (f: Fixture, sec: string, id: string) =>
  drawSection(f.model, sec).primitives.flatMap((p) =>
    p.source.dimensionId === id && p.kind === 'text' ? [p.text] : [],
  );

/** Bod uprostřed řezaného prvku (z dotazu section.elements). */
function middle(f: Fixture, sec: string, id: string) {
  type Cut = { cut: { elementId: string; u0: number; u1: number; bottom: number; top: number }[] };
  const r = q<Cut>(f, 'section.elements', { sectionId: sec }).cut.find((x) => x.elementId === id);
  if (!r) throw new Error('prvek není řezaný');
  return v((r.u0 + r.u1) / 2, (r.bottom + r.top) / 2);
}

describe('úkol uživatele 2026-11-28: popis skladby v řezu', () => {
  it('ČSN 01 3420 / Revit Multi-layer tag: deska shora dolů, materiál + tloušťka, název typu s celkovou tloušťkou', () => {
    const f = fixture();
    const { slab, sec } = scene(f);
    const [id] = f.run('compositionTag.create', {
      sectionId: sec,
      elementId: slab,
      at: middle(f, sec, slab),
    });
    expect(texts(f, sec, id as string)).toEqual([
      'P1 Podlaha anhydrit 150 – 150 mm',
      '– Anhydrit 50 mm',
      '– Tepelná izolace EPS 100 mm',
    ]);
    const prims = drawSection(f.model, sec).primitives.filter((p) => p.source.dimensionId === id);
    expect(prims.some((p) => p.kind === 'fill' && p.source.role === 'tečka popisu')).toBe(true);
    expect(prims.some((p) => p.kind === 'line' && p.source.role === 'odkazová čára')).toBe(true);
  });

  it('základ 4: text se počítá z typu – změna skladby popis hned přepíše', () => {
    const f = fixture();
    const { slab, sec, floorType } = scene(f);
    const [id] = f.run('compositionTag.create', {
      sectionId: sec,
      elementId: slab,
      at: middle(f, sec, slab),
    });
    f.run('slabType.updateLayer', { typeId: floorType, layerIndex: 1, thickness: 60 });
    expect(texts(f, sec, id as string)).toContain('– Anhydrit 60 mm');
    expect(texts(f, sec, id as string)[0]).toBe('P1 Podlaha anhydrit 150 – 160 mm');
  });

  it('volby obsahu: číslování, bez tloušťek, bez názvu, obrácené pořadí (stěna od druhé strany)', () => {
    const f = fixture();
    const { wall, sec } = scene(f);
    const [id] = f.run('compositionTag.create', {
      sectionId: sec,
      elementId: wall,
      at: middle(f, sec, wall),
    });
    expect(texts(f, sec, id as string).slice(1)).toEqual([
      '– Omítka 15 mm',
      '– Zdivo keramické 300 mm',
      '– Tepelná izolace EPS 150 mm',
    ]);
    f.run('compositionTag.update', {
      tagId: id,
      numbered: true,
      thickness: false,
      title: false,
      reverse: true,
    });
    const t = texts(f, sec, id as string);
    expect(t).toHaveLength(3);
    expect(t[0]).toBe('1. Tepelná izolace EPS');
    expect(t[1]).toBe('2. Zdivo keramické');
  });

  it('základ 28: popis je anotace řezu – posun textu, zámek, smazání s prvkem i s řezem', () => {
    const f = fixture();
    const { wall, slab, sec } = scene(f);
    const at = middle(f, sec, slab);
    const [id] = f.run('compositionTag.create', {
      sectionId: sec,
      elementId: slab,
      at,
      textAt: v(at.x + 900, 800),
    });
    type Row = { id: string; textAt: { x: number; y: number }; anchorAt: { x: number; y: number } };
    const row = () => q<Row[]>(f, 'compositionTag.list', { sectionId: sec })[0];
    expect(row()?.textAt).toEqual(v(at.x + 900, 800));
    f.run('compositionTag.move', { tagId: id, textAt: v(at.x - 1200, 1000) });
    expect(row()?.textAt).toEqual(v(at.x - 1200, 1000));
    f.run('compositionTag.update', { tagId: id, locked: true });
    expect(f.editor.execute('compositionTag.move', { tagId: id, textAt: v(0, 0) }).ok).toBe(false);
    expect(f.editor.execute('compositionTag.create', { sectionId: sec, elementId: 'nic', at }).ok).toBe(
      false,
    );
    const [w] = f.run('compositionTag.create', { sectionId: sec, elementId: wall, at: middle(f, sec, wall) });
    f.run('selection.delete', { slabIds: [slab] });
    expect(f.model.compositionTags[id as string]).toBeUndefined();
    expect(f.model.compositionTags[w as string]).toBeDefined();
    f.run('section.delete', { sectionId: sec });
    expect(Object.keys(f.model.compositionTags)).toEqual([]);
  });

  it('popis se smaže příkazem pro anotace řezu (levelDim.delete / selection.delete levelDimIds)', () => {
    const f = fixture();
    const { slab, sec } = scene(f);
    const [id] = f.run('compositionTag.create', {
      sectionId: sec,
      elementId: slab,
      at: middle(f, sec, slab),
    });
    f.run('selection.delete', { levelDimIds: [id] });
    expect(f.model.compositionTags).toEqual({});
  });

  it('migrace 38 → 39: prázdný seznam popisů skladby', () => {
    expect(projectV38toV39({})).toEqual({ compositionTags: {} });
  });
});
