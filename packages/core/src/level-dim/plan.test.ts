import { describe, expect, it } from 'vitest';
import type { Primitive } from '../drawing/primitives.ts';
import { fixture, type Fixture } from '../testing/fixture.ts';
import { drawView } from '../view/draw-view.ts';
import { projectV33toV34 } from './migrate-v33.ts';

const v = (x: number, y: number) => ({ x, y });

function floor(f: Fixture, topOffset = 0) {
  const typeId = Object.values(f.model.slabTypes).find((t) => t.slabFunction === 'floor')?.id;
  const [id] = f.run('slab.create', {
    storeyId: f.storeyId,
    typeId,
    rect: { a: v(0, 0), b: v(4000, 3000) },
    topOffset,
  });
  return id as string;
}

const prims = (f: Fixture, id: string): Primitive[] =>
  drawView(f.model, f.viewId).primitives.filter((p) => p.source.dimensionId === id);
const texts = (ps: readonly Primitive[]) => ps.flatMap((p) => (p.kind === 'text' ? [p.text] : []));

describe('výšková kóta v půdorysu (české zvyklosti, Ardit)', () => {
  it('Ardit / půdorys: kóta podlahy = hodnota horního líce v rámečku tenkou čarou, bez praporku', () => {
    const f = fixture();
    floor(f);
    const [id] = f.run('planLevelDim.create', {
      storeyId: f.storeyId,
      point: v(2000, 1500),
      viewId: f.viewId,
    });
    const ps = prims(f, id as string);
    expect(texts(ps)).toEqual(['±0,000']);
    const box = ps.find((p) => p.kind === 'line' && p.closed);
    expect(box?.kind === 'line' && box.points).toHaveLength(4);
    expect(box?.kind === 'line' && box.stroke.pen).toBe(1);
    expect(ps.some((p) => p.kind === 'fill')).toBe(false);
  });

  it('ČSN 01 3420 / asociativita: kóta bere horní líc desky pod bodem a přepočítá se; bez desky úroveň podlaží', () => {
    const f = fixture();
    const slab = floor(f, 150);
    const [on] = f.run('planLevelDim.create', { storeyId: f.storeyId, point: v(2000, 1500) });
    const [off] = f.run('planLevelDim.create', { storeyId: f.storeyId, point: v(9000, 9000) });
    expect(texts(prims(f, on as string))).toEqual(['+0,150']);
    expect(texts(prims(f, off as string))).toEqual(['±0,000']);
    f.run('slab.update', { slabIds: [slab], topOffset: -450 });
    expect(texts(prims(f, on as string))).toEqual(['-0,450']);
    f.run('selection.delete', { slabIds: [slab] });
    expect(f.model.planLevelDims[on as string]).toBeUndefined();
  });

  it('DSP / kóta terénu u nároží: kroužek s plnou polovinou a čtvercem bodu, RT a UT nad a pod poličkou', () => {
    const f = fixture();
    const [id] = f.run('planLevelDim.create', {
      storeyId: f.storeyId,
      point: v(0, 0),
      textAt: v(-1500, -500),
      marker: 'circle',
      rt: -150,
      ut: -150,
    });
    const ps = prims(f, id as string);
    expect(ps.some((p) => p.kind === 'fill')).toBe(true);
    expect(ps.filter((p) => p.kind === 'line' && p.closed)).toHaveLength(2);
    expect(texts(ps)).toEqual(['RT=-0,150', 'UT=-0,150']);
  });

  it('DSP / kóta terénu: navázaná na roh stěny se s ním posune; popisky a jen UT nastaví styl', () => {
    const f = fixture();
    const w = f.line(v(0, 0), v(5000, 0));
    const corner = f.wall(w).path.start;
    const [id] = f.run('planLevelDim.create', {
      storeyId: f.storeyId,
      point: corner,
      textAt: v(-1500, -800),
      marker: 'circle',
      rt: -200,
      ut: -150,
    });
    expect(f.model.planLevelDims[id as string]?.anchor?.wallId).toBe(w);
    f.run('wall.move', { wallIds: [w], vector: v(0, 1000) });
    const circleLine = prims(f, id as string).find((p) => p.kind === 'line' && p.closed);
    const ys = circleLine?.kind === 'line' ? circleLine.points.map((q) => q.y) : [];
    expect(Math.min(...ys)).toBeGreaterThan(500);
    const style = f.model.views[f.viewId]!.styleId;
    f.run('style.setTerrainLabels', { styleId: style, ut: 'UT', show: 'ut' });
    expect(texts(prims(f, id as string))).toEqual(['UT=-0,150']);
  });

  it('základ 28: kóta je ve skupině anotací Výškové kóty; zamčená se neposune, posun jen textu u kroužku', () => {
    const f = fixture();
    const [id] = f.run('planLevelDim.create', {
      storeyId: f.storeyId,
      point: v(0, 0),
      marker: 'circle',
      textAt: v(0, 0),
      viewId: f.viewId,
    });
    // Hlášení uživatele: skupina „Výškové kóty“ je ve všech stylech (Studie i Projekt).
    expect(f.model.planLevelDims[id as string]?.annotationLayerId).toBe('ann-levels');
    f.run('planLevelDim.move', { levelDimId: id, delta: v(500, 0), textOnly: true });
    expect(f.model.planLevelDims[id as string]).toMatchObject({ point: v(0, 0), textAt: v(500, 0) });
    f.run('planLevelDim.update', { levelDimId: id, locked: true });
    expect(f.editor.execute('planLevelDim.move', { levelDimId: id, delta: v(1, 0) }).ok).toBe(false);
    f.run('selection.delete', { levelDimIds: [id] });
    expect(f.model.planLevelDims).toEqual({});
  });

  it('základ 9: migrace 33 → 34 přidá prázdné výškové kóty v půdorysu', () => {
    expect(projectV33toV34({})).toEqual({ planLevelDims: {} });
  });

  it('pokyn uživatele / jeden klik: kóta terénu bez polohy textu má text šikmo ven od budovy', () => {
    const f = fixture();
    f.line(v(0, 0), v(5000, 0));
    f.line(v(5000, 0), v(5000, 4000));
    const [id] = f.run('planLevelDim.create', {
      storeyId: f.storeyId,
      point: v(5000, 0),
      marker: 'circle',
      viewId: f.viewId,
    });
    const d = f.model.planLevelDims[id as string];
    expect(d && d.textAt.x).toBeGreaterThan(5000);
    expect(d && d.textAt.y).toBeLessThan(0);
  });

  it('Revit Spot Elevation „Leader“: rámeček mimo kótovaný bod má odkazovou čáru od bodu k rámečku', () => {
    const f = fixture();
    floor(f);
    const [on] = f.run('planLevelDim.create', { storeyId: f.storeyId, point: v(2000, 1500) });
    const [off] = f.run('planLevelDim.create', {
      storeyId: f.storeyId,
      point: v(2000, 1500),
      textAt: v(3500, 2500),
    });
    const open = (id: string) => prims(f, id).filter((p) => p.kind === 'line' && !p.closed);
    expect(open(on as string)).toHaveLength(0);
    expect(open(off as string)).toHaveLength(1);
  });
});
