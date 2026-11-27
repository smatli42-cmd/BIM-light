import { describe, expect, it } from 'vitest';
import { fixture, type Fixture } from '../testing/fixture.ts';
import { drawView } from '../view/draw-view.ts';
import { drawSection } from './draw.ts';
import { lineIntervals, sectionFrame } from './frame.ts';
import { projectV31toV32 } from './migrate-v31.ts';

const v = (x: number, y: number) => ({ x, y });
/** Zalomený řez: od (0,−2000) nahoru do (0,1000), zalomení doprava na x = 4000, pak nahoru do (4000,5000). */
const jog = [v(0, -2000), v(0, 1000), v(4000, 1000), v(4000, 5000)];

describe('nástroj Řez (Ardit): zalomený řez, hloubka, vzdálená oblast, styl řezu', () => {
  it('Ardit „Geometrická metoda“: zalomený řez má dva úseky roviny v různé hloubce, zalomení neřeže', () => {
    const f = sectionFrame({ points: jog, direction: 'right', depth: null });
    expect(f.parts).toHaveLength(2);
    expect(f.parts.map((p) => Math.round(p.d0))).toEqual([0, 4000]);
    // Stěna podél osy x v y = −1000 je jen v dosahu prvního úseku, v y = 3000 jen druhého.
    const wall = (y: number) => [v(-1000, y), v(6000, y), v(6000, y + 200), v(-1000, y + 200)];
    expect(lineIntervals(f, [wall(-1000)])).toHaveLength(1);
    expect(lineIntervals(f, [wall(3000)])).toHaveLength(1);
    expect(lineIntervals(f, [wall(-3000)])).toHaveLength(0);
  });

  it('Ardit „Geometrická metoda“: zalomení musí být kolmé a krajní úseky musí řezat', () => {
    const f = fixture();
    expect(f.editor.execute('section.create', { points: jog }).ok).toBe(true);
    const skew = f.editor.execute('section.create', {
      points: [v(0, 0), v(0, 1000), v(500, 1500), v(500, 3000)],
    });
    expect(skew.ok).toBe(false);
    const lastJog = f.editor.execute('section.create', { points: [v(0, 0), v(0, 1000), v(2000, 1000)] });
    expect(lastJog.ok).toBe(false);
  });

  it('pravidla-interakce / výběr: značka zalomeného řezu má tlusté úsečky i u zalomení; Del řez smaže', () => {
    const f = fixture();
    const [id] = f.run('section.create', { points: jog });
    const thick = drawView(f.model, f.viewId).primitives.filter(
      (p) => p.kind === 'line' && p.source.role === 'značka řezu' && p.stroke.pen === 5,
    );
    expect(thick).toHaveLength(6);
    f.run('selection.delete', { sectionIds: [id] });
    expect(f.model.sections).toEqual({});
  });

  it('základ 6: section.move posune celou čáru, start / end změní jen krajní body', () => {
    const f = fixture();
    const [id] = f.run('section.create', { points: jog });
    f.run('section.move', { sectionId: id, delta: v(100, 0) });
    expect(f.model.sections[id as string]?.points[2]).toEqual(v(4100, 1000));
    f.run('section.update', { sectionId: id, end: v(4100, 6000) });
    expect(f.model.sections[id as string]?.points).toHaveLength(4);
    expect(f.model.sections[id as string]?.points[3]).toEqual(v(4100, 6000));
  });

  it('Ardit „Styl“: řez se stylem bere hloubku ze stylu; smazaný styl nechá hodnoty v řezu', () => {
    const f = fixture();
    const [pid] = f.run('sectionPreset.create', { name: 'Krátký', depth: 1000, farClip: null });
    const back = f.line(v(0, 3000), v(6000, 3000));
    const [id] = f.run('section.create', { start: v(-1000, 0), end: v(7000, 0), presetId: pid });
    const seen = (fx: Fixture) =>
      drawSection(fx.model, id as string).primitives.some((p) => p.source.elementId === back);
    expect(seen(f)).toBe(false);
    f.run('sectionPreset.update', { presetId: pid, depth: 5000 });
    expect(seen(f)).toBe(true);
    f.run('sectionPreset.delete', { presetId: pid });
    expect(f.model.sections[id as string]).toMatchObject({ presetId: null, depth: 5000 });
  });

  it('Ardit „Vzdálená oblast od“: prvek dál než vzdálená oblast se kreslí grafikou vzdálené oblasti', () => {
    const f = fixture();
    const near = f.line(v(0, 1000), v(2000, 1000));
    const far = f.line(v(3000, 5000), v(6000, 5000));
    const [id] = f.run('section.create', { start: v(-1000, 0), end: v(7000, 0), farClip: 3000 });
    const pen = (wall: string) =>
      drawSection(f.model, id as string).primitives.find(
        (p) => p.kind === 'line' && p.source.elementId === wall && p.source.role === 'pohledová hrana',
      );
    const g = f.model.display.farArea;
    expect(pen(far)).toMatchObject({ stroke: { pen: g?.projectionPen, color: g?.lineColor } });
    expect(pen(near)).toMatchObject({ stroke: { pen: 3 } });
  });

  it('základ 9: migrace 31 → 32 – body čáry, vzdálená oblast vyp., styly řezu, skupina Řezy a pohledy', () => {
    const f = fixture();
    const { sectionPresets: _p, ...old } = f.model;
    const sections = { s1: { id: 's1', start: v(0, 0), end: v(1000, 0), annotationLayerId: 'x' } };
    const display = { ...f.model.display, farArea: undefined };
    const out = projectV31toV32({ ...old, display, sections } as unknown as Record<string, unknown>);
    expect((out['sections'] as Record<string, unknown>)['s1']).toEqual({
      id: 's1',
      points: [v(0, 0), v(1000, 0)],
      farClip: null,
      presetId: null,
      annotationLayerId: 'ann-sections',
    });
    expect(Object.keys(out['sectionPresets'] as object)).toHaveLength(2);
    const d = out['display'] as typeof f.model.display;
    expect(d.layers['ann-sections']?.name).toBe('Řezy a pohledy');
    expect(d.farArea).toBeDefined();
  });
});
