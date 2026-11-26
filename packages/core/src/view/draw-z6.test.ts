import { describe, expect, it } from 'vitest';
import type { Primitive } from '../drawing/primitives.ts';
import { vec } from '../geometry/index.ts';
import { exportDisplayPackage, parseDisplayPackage } from '../style/package.ts';
import { resolveGraphics } from '../style/graphics.ts';
import { elementFacts } from '../style/conditions.ts';
import { fixture, type Fixture } from '../testing/fixture.ts';
import { drawView } from './draw-view.ts';

const prims = (f: Fixture, id?: string) =>
  drawView(f.model, f.viewId).primitives.filter((p) => !id || p.source?.elementId === id);
const roles = (ps: Primitive[]) => ps.map((p) => p.source?.role);
const lines = (ps: Primitive[]) => ps.filter((p) => p.kind === 'line');
const styleId = (f: Fixture, name: string) =>
  Object.values(f.model.display.styles).find((s) => s.name === name)!.id;
const comboId = (f: Fixture, name: string) =>
  Object.values(f.model.display.overrideCombinations).find((c) => c.name === name)!.id;

describe('plan-steny / Z6: stěna a rovina řezu', () => {
  it('stěna v řezu má výplň; parapetní zídka pod rovinou jen obrys perem pohledu; nad rovinou čárkovaně', () => {
    const f = fixture();
    const id = f.line(vec(0, 0), vec(4000, 0));
    expect(roles(prims(f, id))).toContain('výplň');
    f.run('wall.setHeight', {
      wallIds: [id],
      height: { baseOffset: 0, top: { kind: 'height', value: 800 } },
    });
    const below = prims(f, id);
    expect(roles(below)).not.toContain('výplň');
    expect(roles(below)).toContain('stěna pod řezem');
    const g = resolveGraphics(f.model.display, f.model.views[f.viewId]!, elementFacts(f.model, f.wall(id)));
    expect(lines(below).every((p) => p.kind === 'line' && p.stroke.pen === g.effect.projectionPen)).toBe(
      true,
    );
    f.run('wall.setHeight', {
      wallIds: [id],
      height: { baseOffset: 1500, top: { kind: 'height', value: 1000 } },
    });
    const above = lines(prims(f, id));
    expect(above.every((p) => p.kind === 'line' && p.stroke.lineType === 'dashed')).toBe(true);
  });

  it('změna roviny řezu přepne parapetní zídku do řezu', () => {
    const f = fixture();
    const id = f.line(vec(0, 0), vec(4000, 0));
    f.run('wall.setHeight', {
      wallIds: [id],
      height: { baseOffset: 0, top: { kind: 'height', value: 800 } },
    });
    expect(roles(prims(f, id))).not.toContain('výplň');
    f.run('view.setCutPlane', { viewId: f.viewId, height: 500 });
    expect(roles(prims(f, id))).toContain('výplň');
  });
});

describe('plan-steny / Z6: tři podrobnosti', () => {
  it('hrubá jen obrys; střední čáry mezi vrstvami; jemná navíc hranice jádra perem řezu', () => {
    const f = fixture();
    const id = f.line(vec(0, 0), vec(4000, 0), { typeId: f.type('Obvodová zateplená 465') });
    f.run('view.setDetail', { viewId: f.viewId, detail: 'coarse' });
    expect(roles(prims(f, id))).not.toContain('hranice vrstvy');
    f.run('view.setDetail', { viewId: f.viewId, detail: 'medium' });
    expect(roles(prims(f, id))).toContain('hranice vrstvy');
    expect(roles(prims(f, id))).not.toContain('hranice jádra');
    f.run('view.setDetail', { viewId: f.viewId, detail: 'fine' });
    const core = lines(prims(f, id)).filter((p) => p.source?.role === 'hranice jádra');
    const outline = lines(prims(f, id)).find((p) => p.source?.role === 'obrys');
    expect(core.length).toBeGreaterThan(0);
    expect(core[0]?.kind === 'line' && outline?.kind === 'line' && core[0].stroke.pen).toBe(
      outline?.kind === 'line' && outline.stroke.pen,
    );
  });

  it('konstrukční zobrazení: jen jádro kreslí jen nosnou vrstvu', () => {
    const f = fixture();
    const id = f.line(vec(0, 0), vec(4000, 0), { typeId: f.type('Obvodová zateplená 465') });
    f.run('view.setDetail', { viewId: f.viewId, detail: 'medium' });
    const all = drawView(f.model, f.viewId).primitives.filter((p) => p.source?.elementId === id);
    const core = drawView(f.model, f.viewId, { structure: 'core' }).primitives.filter(
      (p) => p.source?.elementId === id,
    );
    expect(roles(all)).toContain('hranice vrstvy');
    expect(roles(core)).not.toContain('hranice vrstvy');
  });
});

describe('plan-steny / Z6: fáze a „proč“', () => {
  it('Bourací práce: bouraná stěna žlutě čárkovaně, nová skrytá; přepis prvku vyhraje', () => {
    const f = fixture();
    const old = f.line(vec(0, 0), vec(4000, 0));
    const neu = f.line(vec(0, 3000), vec(4000, 3000));
    f.run('wall.setProperties', { wallIds: [old], status: 'demolished' });
    f.run('wall.setProperties', { wallIds: [neu], status: 'new' });
    f.run('view.setOverrideCombination', {
      viewId: f.viewId,
      combinationId: comboId(f, 'Fáze – bourací práce'),
    });
    const o = lines(prims(f, old));
    expect(o.every((p) => p.kind === 'line' && p.stroke.lineType === 'dashed')).toBe(true);
    expect(prims(f, neu)).toEqual([]);
    const view = f.model.views[f.viewId]!;
    const why = resolveGraphics(f.model.display, view, elementFacts(f.model, f.wall(old))).why.lineColor;
    expect(why).toMatchObject({ level: 3, source: 'Bourání žlutě čárkovaně' });
    f.run('element.setGraphicOverride', { elementIds: [old], effect: { lineColor: '#0000ff' } });
    const after = resolveGraphics(
      f.model.display,
      f.model.views[f.viewId]!,
      elementFacts(f.model, f.wall(old)),
    );
    expect(after.effect.lineColor).toBe('#0000ff');
    expect(after.why.lineColor.level).toBe(5);
  });

  it('tatáž stěna ve Studii (hrubě, bez vrstev) a v Projektu (vrstvy a šrafy)', () => {
    const f = fixture();
    const id = f.line(vec(0, 0), vec(4000, 0), { typeId: f.type('Obvodová zateplená 465') });
    f.run('view.setStyle', { viewId: f.viewId, styleId: styleId(f, 'Studie') });
    expect(roles(prims(f, id))).not.toContain('hranice vrstvy');
    f.run('view.setStyle', { viewId: f.viewId, styleId: styleId(f, 'Projekt') });
    expect(roles(prims(f, id))).toContain('hranice vrstvy');
  });
});

describe('plan-steny / Z6: konce stěn, značka osy, měřítko, balíček stylu', () => {
  const len = (ps: Primitive[]) =>
    lines(ps).reduce((sum, p) => {
      if (p.kind !== 'line') return sum;
      const pts = p.closed ? [...p.points, p.points[0]!] : p.points;
      return sum + pts.slice(1).reduce((s, q, i) => s + Math.hypot(q.x - pts[i]!.x, q.y - pts[i]!.y), 0);
    }, 0);

  it('konce stěn vypnuté grafikou: čela volných konců se nekreslí; značka osy čerchovaně', () => {
    const f = fixture();
    const id = f.line(vec(0, 0), vec(4000, 0));
    const before = len(prims(f, id).filter((p) => p.source?.role === 'obrys'));
    f.run('element.setGraphicOverride', { elementIds: [id], effect: { endLines: false, refLine: true } });
    const after = len(prims(f, id).filter((p) => p.source?.role === 'obrys'));
    expect(before - after).toBeCloseTo(600, 0);
    const mark = lines(prims(f, id)).find((p) => p.source?.role === 'referenční čára');
    expect(mark?.kind === 'line' && mark.stroke.lineType).toBe('dash-dot');
  });

  it('základ 29: změna měřítka nemění geometrii ani pera kresby stěn', () => {
    const f = fixture();
    f.line(vec(0, 0), vec(4000, 0), { typeId: f.type('Obvodová zateplená 465') });
    const a = drawView(f.model, f.viewId).primitives.filter((p) => p.source?.role !== undefined);
    f.run('view.setScale', { viewId: f.viewId, scale: 200 });
    const b = drawView(f.model, f.viewId).primitives.filter((p) => p.source?.role !== undefined);
    const walls = (ps: Primitive[]) => ps.filter((p) => p.kind !== 'text');
    expect(walls(b).filter((p) => p.kind !== 'hatch')).toEqual(walls(a).filter((p) => p.kind !== 'hatch'));
  });

  it('základ 31: balíček stylu s novými vlastnostmi grafiky projde exportem a importem', () => {
    const f = fixture();
    const display = { ...f.model.display, baseGraphics: { ...f.model.display.baseGraphics, refLine: true } };
    const r = parseDisplayPackage(exportDisplayPackage(display));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.settings.baseGraphics).toMatchObject({ refLine: true, endLines: true });
  });
});
