import { describe, expect, it } from 'vitest';
import type { Primitive } from '../drawing/primitives.ts';
import { drawSection } from '../section/draw.ts';
import { fixture, type Fixture } from '../testing/fixture.ts';
import { drawView } from '../view/draw-view.ts';
import { LEVEL_LAYER } from '../style/presets/defaults.ts';
import { projectV34toV35 } from './migrate-v34.ts';

const v = (x: number, y: number) => ({ x, y });
const levels = (ps: readonly Primitive[]) => ps.filter((p) => p.source.role === 'výšková kóta');

function scene(f: Fixture) {
  const typeId = Object.values(f.model.slabTypes).find((t) => t.slabFunction === 'floor')?.id;
  f.run('slab.create', {
    storeyId: f.storeyId,
    typeId,
    rect: { a: v(0, 0), b: v(4000, 3000) },
    topOffset: 150,
  });
  f.run('planLevelDim.create', { storeyId: f.storeyId, point: v(2000, 1500), viewId: f.viewId });
  const [sec] = f.run('section.create', { start: v(2000, -1000), end: v(2000, 4000) });
  f.run('levelDim.create', { sectionId: sec, ref: { kind: 'storey', storeyId: f.storeyId }, at: 500 });
  return sec as string;
}

describe('katalog-pohledy 26/29: styl mění jen vzhled, výškové kóty zůstanou', () => {
  it('katalog-pohledy 26/29: výšková kóta v půdorysu po přepnutí Studie → Projekt zůstane (hodnota, poloha, velikost)', () => {
    const f = fixture();
    scene(f);
    const before = levels(drawView(f.model, f.viewId).primitives);
    expect(before.length).toBeGreaterThan(0);
    f.run('view.setStyle', { viewId: f.viewId, styleId: f.style('Projekt') });
    expect(levels(drawView(f.model, f.viewId).primitives)).toEqual(before);
  });

  it('katalog-pohledy 26/29: výškové kóty v řezu po přepnutí stylu řezu zůstanou stejné', () => {
    const f = fixture();
    const sec = scene(f);
    const before = levels(drawSection(f.model, sec).primitives);
    f.run('section.update', { sectionId: sec, styleId: f.style('Projekt') });
    expect(levels(drawSection(f.model, sec).primitives)).toEqual(before);
  });

  it('základ 9: migrace 34 → 35 – skupina Výškové kóty ve všech stylech, kóty se do ní přesunou', () => {
    const f = fixture();
    const { [LEVEL_LAYER.id]: _gone, ...layers } = f.model.display.layers;
    const display = { ...f.model.display, layers };
    const out = projectV34toV35({
      display,
      levelDims: { a: { id: 'a', annotationLayerId: 'x' } },
      planLevelDims: { b: { id: 'b', annotationLayerId: 'y' } },
    });
    const d = out['display'] as typeof display;
    expect(d.layers[LEVEL_LAYER.id]?.name).toBe('Výškové kóty');
    expect(Object.values(d.layerCombinations).every((c) => c.states[LEVEL_LAYER.id]?.visible)).toBe(true);
    expect((out['levelDims'] as Record<string, { annotationLayerId: string }>)['a']?.annotationLayerId).toBe(
      LEVEL_LAYER.id,
    );
    expect(
      (out['planLevelDims'] as Record<string, { annotationLayerId: string }>)['b']?.annotationLayerId,
    ).toBe(LEVEL_LAYER.id);
    expect(d.paperSizes.levelText).toBe(1.8);
  });
});
