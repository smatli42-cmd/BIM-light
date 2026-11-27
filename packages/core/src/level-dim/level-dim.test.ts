import { describe, expect, it } from 'vitest';
import type { Primitive } from '../drawing/primitives.ts';
import { drawSection } from '../section/draw.ts';
import { fixture, type Fixture } from '../testing/fixture.ts';
import { projectV32toV33 } from './migrate-v32.ts';
import { slabLevels } from '../slab/geometry.ts';
import type { Slab } from '../slab/types.ts';
import { drawLevelSymbol } from './symbol.ts';
import { absoluteText, elevationText, zeroToBpv } from './value.ts';

const v = (x: number, y: number) => ({ x, y });

/** Strop ŽB 250 nad místností a řez napříč (styl Projekt). */
function scene(f: Fixture) {
  const typeId = Object.values(f.model.slabTypes).find((t) => t.name === 'ŽB strop 250')?.id;
  const rect = { a: v(0, 0), b: v(6000, 4000) };
  const [slab] = f.run('slab.create', { storeyId: f.storeyId, typeId, rect, topOffset: 3000 });
  const [sec] = f.run('section.create', {
    start: v(3000, -1000),
    end: v(3000, 5000),
    styleId: f.style('Projekt'),
  });
  return { slab: slab as string, sec: sec as string };
}

const marks = (f: Fixture, sec: string, id: string) =>
  drawSection(f.model, sec).primitives.filter((p) => p.source.dimensionId === id);
const textOf = (ps: readonly Primitive[]) => ps.flatMap((p) => (p.kind === 'text' ? [p.text] : []))[0];

describe('ČSN 01 3420: výškové kóty v řezu', () => {
  it('ČSN 01 3420 / zápis: metry na 3 místa s čárkou, ±0,000, nad nulou +, pod nulou -, absolutní m n. m.', () => {
    const f = fixture();
    expect(elevationText(0)).toBe('±0,000');
    expect(elevationText(2750)).toBe('+2,750');
    expect(elevationText(-450)).toBe('-0,450');
    const geo = {
      ...f.model,
      project: { ...f.model.project, georef: { ...f.model.project.georef, elevationBpv: 250.85 } },
    };
    expect(absoluteText(geo, 0)).toBe('250,850 m n. m.');
    expect(absoluteText(geo, 3000)).toBe('253,850 m n. m.');
    expect(zeroToBpv(geo)).toBe('±0,000 = 250,850 m n. m. Bpv');
  });

  it('ČSN 01 3420 / praporek: pravoúhlý rovnoramenný trojúhelník hrotem na úrovni, raménko, text nad', () => {
    const f = fixture();
    const g = { ...f.model.display.baseGraphics };
    const ps = drawLevelSymbol(
      { x: 0, z: 3000, text: '+3,000', below: false, filled: false },
      f.model.display.paperSizes,
      50,
      g,
      { role: 'x' },
    );
    const tri = ps.find((p) => p.kind === 'line' && p.closed);
    const h = 2.5 * 50;
    expect(tri?.kind === 'line' && tri.points).toEqual([v(0, 3000), v(-h, 3000 + h), v(h, 3000 + h)]);
    const arm = ps.find((p) => p.kind === 'line' && !p.closed);
    expect(arm?.kind === 'line' && arm.points.every((q) => q.y === 3000)).toBe(true);
    expect(arm?.kind === 'line' && (arm.points[1]?.x ?? 0) - (arm.points[0]?.x ?? 0)).toBeGreaterThan(2 * h);
    const text = ps.find((p) => p.kind === 'text');
    expect(text?.kind === 'text' && text.at.y).toBeGreaterThan(3000 + h);
    expect(ps.some((p) => p.kind === 'fill')).toBe(false);
    const below = drawLevelSymbol(
      { x: 0, z: 0, text: '', below: true, filled: true },
      f.model.display.paperSizes,
      50,
      g,
      { role: 'x' },
    );
    expect(below.some((p) => p.kind === 'fill')).toBe(true);
    expect(below.find((p) => p.kind === 'text')?.kind === 'text').toBe(true);
  });

  it('základ 29: velikost praporku je v nastavení zobrazení (paperSizes.levelMark), ne v generátoru', () => {
    const f = fixture();
    const sizes = { ...f.model.display.paperSizes, levelMark: 3.5 };
    const ps = drawLevelSymbol(
      { x: 0, z: 0, text: '', below: false, filled: false },
      sizes,
      100,
      f.model.display.baseGraphics,
      { role: 'x' },
    );
    const tri = ps.find((p) => p.kind === 'line' && p.closed);
    expect(tri?.kind === 'line' && tri.points[1]?.y).toBe(350);
  });

  it('ČSN 01 3420 / asociativita: kóta horního líce stropu se po změně výšky přepočítá', () => {
    const f = fixture();
    const { slab, sec } = scene(f);
    const [id] = f.run('levelDim.create', {
      sectionId: sec,
      ref: { kind: 'edge', elementId: slab, edge: 'top' },
      at: 2000,
    });
    expect(textOf(marks(f, sec, id as string))).toBe('+3,000');
    f.run('slab.update', { slabIds: [slab], topOffset: 2750 });
    expect(textOf(marks(f, sec, id as string))).toBe('+2,750');
    f.run('levelDim.update', {
      levelDimId: id,
      ref: { kind: 'edge', elementId: slab, edge: 'bottom' },
      below: true,
    });
    expect(textOf(marks(f, sec, id as string))).toBe(
      elevationText(slabLevels(f.model, f.model.elements[slab] as Slab).bottom),
    );
  });

  it('ČSN 01 3420 / výplň: relativní nevyplněná, absolutní plná; styl „vždy plné“ (Ardit) vyplní i relativní', () => {
    const f = fixture();
    const { sec } = scene(f);
    const ref = { kind: 'storey', storeyId: f.storeyId };
    const [rel] = f.run('levelDim.create', { sectionId: sec, ref, at: 1000 });
    const [abs] = f.run('levelDim.create', { sectionId: sec, ref, at: 3000, absolute: true });
    const filled = (id: string) => marks(f, sec, id).some((p) => p.kind === 'fill');
    expect([filled(rel as string), filled(abs as string)]).toEqual([false, true]);
    expect(textOf(marks(f, sec, abs as string))).toBe('0,000 m n. m.');
    f.run('style.setLevelMarkFill', { styleId: f.style('Projekt'), filled: true });
    expect(filled(rel as string)).toBe(true);
  });

  it('ČSN 01 3420 / terén (rozhodnutí uživatele): kóta terénu zadaná číslem má plný trojúhelník', () => {
    const f = fixture();
    const { sec } = scene(f);
    const [id] = f.run('levelDim.create', { sectionId: sec, ref: { kind: 'terrain', z: -150 }, at: 0 });
    expect(marks(f, sec, id as string).some((p) => p.kind === 'fill')).toBe(true);
    expect(textOf(marks(f, sec, id as string))).toBe('-0,150');
  });

  it('základ 28: skrytá skupina anotací kótu skryje; zamčenou nejde posunout, smazat ano', () => {
    const f = fixture();
    const { sec } = scene(f);
    const [id] = f.run('levelDim.create', {
      sectionId: sec,
      ref: { kind: 'storey', storeyId: f.storeyId },
      at: 0,
    });
    f.run('levelDim.update', { levelDimId: id, locked: true });
    expect(f.editor.execute('levelDim.move', { levelDimId: id, at: 500 }).ok).toBe(false);
    f.run('section.update', { sectionId: sec, styleId: f.style('Projekt') });
    const layer = f.model.levelDims[id as string]?.annotationLayerId;
    const s = f.model.sections[sec]!;
    const hidden = { ...s, local: { layerStates: { [layer as string]: { visible: false, locked: false } } } };
    const m2 = { ...f.model, sections: { ...f.model.sections, [sec]: hidden } };
    expect(drawSection(m2, sec).primitives.some((p) => p.source.dimensionId === id)).toBe(false);
    f.run('selection.delete', { levelDimIds: [id] });
    expect(f.model.levelDims).toEqual({});
  });

  it('základ 7: smazaná deska vezme své výškové kóty, smazaný řez všechny své kóty', () => {
    const f = fixture();
    const { slab, sec } = scene(f);
    f.run('levelDim.create', { sectionId: sec, ref: { kind: 'edge', elementId: slab, edge: 'top' }, at: 0 });
    f.run('levelDim.create', { sectionId: sec, ref: { kind: 'storey', storeyId: f.storeyId }, at: 0 });
    f.run('selection.delete', { slabIds: [slab] });
    expect(Object.keys(f.model.levelDims)).toHaveLength(1);
    f.run('section.delete', { sectionId: sec });
    expect(f.model.levelDims).toEqual({});
  });

  it('rozhodnutí 19: automatické kóty úrovní podlaží v řezu jsou praporky ČSN (nevyplněné)', () => {
    const f = fixture();
    const { sec } = scene(f);
    const ps = drawSection(f.model, sec).primitives.filter((p) => p.source.role === 'výšková kóta');
    expect(ps.some((p) => p.kind === 'text' && p.text === '1.NP ±0,000')).toBe(true);
    expect(ps.some((p) => p.kind === 'fill')).toBe(false);
  });

  it('základ 9: migrace 32 → 33 – prázdné výškové kóty a velikost praporku 2,5 mm', () => {
    const out = projectV32toV33({ display: { paperSizes: { labelText: 2.5 } } });
    expect(out['levelDims']).toEqual({});
    expect((out['display'] as { paperSizes: unknown }).paperSizes).toEqual({
      labelText: 2.5,
      levelMark: 2.5,
    });
  });
});
