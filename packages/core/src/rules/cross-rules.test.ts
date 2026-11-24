import { describe, expect, it } from 'vitest';
import { fixture } from '../testing/fixture.ts';
import { isSelectable } from '../view/draw-view.ts';
import { CROSS_RULES, rulesFor } from './cross-rules.ts';

describe('rozhodnutí / základ 7: průřezová pravidla na jednom místě (pravidlo × typ prvku)', () => {
  it('základ 7: každý typ prvku má v tabulce všechna pravidla', () => {
    const keys = Object.keys(rulesFor('wall')).sort();
    for (const row of Object.values(CROSS_RULES)) expect(Object.keys(row).sort()).toEqual(keys);
  });

  it('katalog-kresleni / část 2: pořadí přichytávání u stěny – konec, průsečík, střed, líc, osa', () => {
    expect(rulesFor('wall').snaps).toEqual(['endpoint', 'intersection', 'midpoint', 'face', 'axis']);
  });

  it('základ 7: na stěnu jde kótovat líce i osu, délku i úhel; stěna jde zamknout kótou', () => {
    const w = rulesFor('wall');
    expect(w.dimensionFaces).toEqual(['ref', 'opp', 'axis']);
    expect([w.lengthDimension, w.angularDimension, w.lockable]).toEqual([true, true, true]);
  });

  it('základ 7: výběr se řídí tabulkou i stavem vrstvy (stěna i kóta)', () => {
    const f = fixture();
    const id = f.line({ x: 0, y: 0 }, { x: 5000, y: 0 });
    const [len] = f.run('dimension.create', {
      kind: 'length',
      ref: { wallId: id, face: 'ref' },
      viewId: f.viewId,
    });
    const view = f.model.views[f.viewId]!;
    expect(isSelectable(f.model, view, id)).toBe(true);
    expect(isSelectable(f.model, view, len!)).toBe(true);
    f.run('view.setLayerState', {
      viewId: f.viewId,
      layerId: f.layer('Kóty a popisky – studie'),
      locked: true,
    });
    expect(isSelectable(f.model, f.model.views[f.viewId]!, len!)).toBe(false);
  });
});
