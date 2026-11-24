import { describe, expect, it } from 'vitest';
import type { Primitive } from '../drawing/primitives.ts';
import { fixture, room, type Fixture } from '../testing/fixture.ts';
import { wallGeometry } from '../wall/geometry.ts';
import { drawView, isSelectable } from './draw-view.ts';
import { isViewModified } from './effective.ts';

const prims = (f: Fixture) => drawView(f.model, f.viewId).primitives;
const kinds = (ps: readonly Primitive[]) => [...new Set(ps.map((p) => p.kind))].sort();
const toProject = (f: Fixture) => f.run('view.setStyle', { viewId: f.viewId, styleId: f.style('Projekt') });
const toStudy = (f: Fixture) => f.run('view.setStyle', { viewId: f.viewId, styleId: f.style('Studie') });

function withDimension(f: Fixture) {
  const [left, , right] = room(f);
  const [dim] = f.run('dimension.create', {
    kind: 'linear',
    refs: [
      { wallId: left, face: 'ref' },
      { wallId: right, face: 'ref' },
    ],
    viewId: f.viewId,
    offset: 600,
  });
  return { left, right, dim: dim as string };
}

describe('katalog-pohledy-styly / První pískoviště: testy', () => {
  it('přepnutí stylu nezmění model ani kóty', () => {
    const f = fixture();
    withDimension(f);
    const { elements, dimensions, relations } = f.model;
    toProject(f);
    expect(f.model.elements).toBe(elements);
    expect(f.model.dimensions).toBe(dimensions);
    expect(f.model.relations).toBe(relations);
  });

  it('kóta vytvořená ve Studii je v Projektu skrytá a po návratu beze změny', () => {
    const f = fixture();
    const { dim } = withDimension(f);
    const before = f.model.dimensions[dim];
    const has = () => prims(f).some((p) => p.source.dimensionId === dim);
    expect(has()).toBe(true);
    toProject(f);
    expect(has()).toBe(false);
    toStudy(f);
    expect(has()).toBe(true);
    expect(f.model.dimensions[dim]).toBe(before);
  });

  it('stejná stěna ve Studii a v Projektu: stejná geometrie, jiná kresba (hrubá × střední)', () => {
    const f = fixture();
    const id = f.line({ x: 0, y: 0 }, { x: 5000, y: 0 }, { typeId: f.type('Obvodová zateplená 465') });
    const geomStudy = wallGeometry(f.model, f.wall(id));
    const study = prims(f);
    toProject(f);
    const project = prims(f);
    expect(wallGeometry(f.model, f.wall(id))).toEqual(geomStudy);
    expect(kinds(study)).toEqual(['fill', 'line']);
    expect(kinds(project)).toEqual(['hatch', 'line']);
    expect(project.filter((p) => p.source.role === 'hranice vrstvy')).toHaveLength(2);
    expect(project.filter((p) => p.kind === 'hatch')).toHaveLength(3);
  });

  it('změna měřítka mění jen tloušťky čar, velikost textů, značek a šraf na papíře zůstává', () => {
    const f = fixture();
    toProject(f);
    f.run('view.setScale', { viewId: f.viewId, scale: 50 });
    withDimension(f);
    const at50 = prims(f);
    expect(at50.some((p) => p.kind === 'text')).toBe(true);
    f.run('view.setScale', { viewId: f.viewId, scale: 100 });
    const at100 = drawView(f.model, f.viewId);
    expect(at100.scale).toBe(100);
    const texts = (ps: readonly Primitive[]) =>
      ps.filter((p) => p.kind === 'text').map((p) => p.kind === 'text' && p.heightMm);
    expect(texts(at100.primitives)).toEqual(texts(at50));
    const hatches = (ps: readonly Primitive[]) =>
      ps.filter((p) => p.kind === 'hatch').map((p) => p.kind === 'hatch' && p.hatch);
    expect(hatches(at100.primitives)).toEqual(hatches(at50));
    const pens = (ps: readonly Primitive[]) => ps.flatMap((p) => (p.kind === 'line' ? [p.stroke.pen] : []));
    expect(pens(at100.primitives)).toEqual(pens(at50));
    // Značka kóty má pevnou délku na papíře, v mm modelu je tedy v 1:100 dvakrát delší.
    const tick = (ps: readonly Primitive[]) => {
      const t = ps.find((p) => p.source.role === 'značka kóty');
      return t && t.kind === 'line'
        ? Math.hypot(t.points[1]!.x - t.points[0]!.x, t.points[1]!.y - t.points[0]!.y)
        : 0;
    };
    expect(tick(at100.primitives) / tick(at50)).toBeCloseTo(2);
  });

  it('zamčená vrstva nejde vybrat, skrytá také ne', () => {
    const f = fixture();
    const id = f.line({ x: 0, y: 0 }, { x: 5000, y: 0 });
    const view = () => f.model.views[f.viewId]!;
    expect(isSelectable(f.model, view(), id)).toBe(true);
    f.run('view.setLayerState', { viewId: f.viewId, layerId: f.layer('Stěny a sloupy'), locked: true });
    expect(isSelectable(f.model, view(), id)).toBe(false);
    expect(prims(f).some((p) => p.source.elementId === id)).toBe(true);
  });

  it('základ 26 / rozhodnutí 4: místní úprava je označená „(upraveno)“ a jde vrátit', () => {
    const f = fixture();
    const id = f.line({ x: 0, y: 0 }, { x: 5000, y: 0 });
    expect(isViewModified(f.model.views[f.viewId]!)).toBe(false);
    f.run('view.setLayerState', { viewId: f.viewId, layerId: f.layer('Stěny a sloupy'), visible: false });
    expect(isViewModified(f.model.views[f.viewId]!)).toBe(true);
    expect(prims(f).some((p) => p.source.elementId === id)).toBe(false);
    f.run('view.resetToStyle', { viewId: f.viewId });
    expect(isViewModified(f.model.views[f.viewId]!)).toBe(false);
    expect(prims(f).some((p) => p.source.elementId === id)).toBe(true);
  });

  it('základ 27: „Uložit jako styl“ vytvoří nový styl z aktuálního stavu pohledu', () => {
    const f = fixture();
    f.run('view.setDetail', { viewId: f.viewId, detail: 'medium' });
    f.run('view.setLayerState', {
      viewId: f.viewId,
      layerId: f.layer('Kóty a popisky – PPS'),
      visible: true,
    });
    const [styleId] = f.run('style.saveFromView', { viewId: f.viewId, name: 'Studie s vrstvami' });
    const style = f.model.display.styles[styleId ?? '']!;
    expect(style.detail).toBe('medium');
    expect(f.model.views[f.viewId]?.styleId).toBe(styleId);
    expect(isViewModified(f.model.views[f.viewId]!)).toBe(false);
    expect(
      f.model.display.layerCombinations[style.layerCombinationId]?.states[f.layer('Kóty a popisky – PPS')]
        ?.visible,
    ).toBe(true);
  });

  it('základ 26: nový pohled = podlaží + styl + výchozí měřítko ze stylu', () => {
    const f = fixture();
    const [v] = f.run('view.create', { storeyId: f.storeyId, styleId: f.style('Projekt') });
    expect(f.model.views[v ?? '']).toMatchObject({ scale: 50, name: '1.NP – Projekt' });
  });

  it('základ 29: velikost čísla kóty je z nastavení projektu (2,5 mm na papíře)', () => {
    const f = fixture();
    withDimension(f);
    const text = prims(f).find((p) => p.kind === 'text');
    expect(text && text.kind === 'text' && [text.heightMm, text.text]).toEqual([2.5, '4000']);
  });
});
