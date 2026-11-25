import { describe, expect, it } from 'vitest';
import { vec } from '../../geometry/index.ts';
import { fixture } from '../../testing/fixture.ts';
import { drawView } from '../../view/draw-view.ts';
import { layerState } from '../../view/effective.ts';

describe('koncepce-rozhrani / 2 G: vrstvy a průchozí materiál v okně', () => {
  it('kombinace vrstev nastaví stavy vrstev pohledu; null vrátí styl', () => {
    const f = fixture();
    const combo =
      Object.values(f.model.display.layerCombinations)[1] ??
      Object.values(f.model.display.layerCombinations)[0];
    f.run('view.setLayerCombination', { viewId: f.viewId, combinationId: combo!.id });
    expect(f.model.views[f.viewId]?.local.layerStates).toEqual(combo!.states);
    f.run('view.setLayerCombination', { viewId: f.viewId, combinationId: null });
    expect(f.model.views[f.viewId]?.local.layerStates).toBeUndefined();
  });

  it('hromadná změna vrstev je jeden krok Zpět', () => {
    const f = fixture();
    const ids = Object.keys(f.model.display.layers).slice(0, 2);
    const states = Object.fromEntries(ids.map((id) => [id, { visible: false }]));
    f.run('view.setLayerStates', { viewId: f.viewId, states });
    const v = f.model.views[f.viewId]!;
    expect(ids.every((id) => !layerState(f.model.display, v, id).visible)).toBe(true);
    f.editor.undo();
    const back = f.model.views[f.viewId]!;
    expect(ids.every((id) => layerState(f.model.display, back, id).visible)).toBe(true);
  });

  it('průchozí materiál vypnutý: mezi stěnami stejného materiálu je dělicí čára (Projekt)', () => {
    const f = fixture();
    const a = f.line(vec(0, 0), vec(3000, 0));
    f.line(vec(3000, 0), vec(6000, 0), { connections: [{ end: 'start', wallId: a, at: 'ATEND' }] });
    f.run('view.setStyle', { viewId: f.viewId, styleId: f.style('Projekt') });
    const inner = (merge: boolean) =>
      drawView(f.model, f.viewId, { mergeMaterials: merge }).primitives.filter(
        (p) => p.kind === 'line' && p.source.role === 'hranice vrstvy',
      ).length;
    expect(inner(true)).toBe(0);
    expect(inner(false)).toBeGreaterThan(0);
  });
});
