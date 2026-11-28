import { describe, expect, it } from 'vitest';
import { drawSection } from '../section/draw.ts';
import { fixture } from '../testing/fixture.ts';
import { drawView } from '../view/draw-view.ts';
import { joinPreviewModel } from './preview.ts';

describe('priority spojování 3: živý náhled vzorových spojů', () => {
  it('rohy L (i vnitřní), T-spoj a strop na obvodové zdi z typů projektu; projekt se nezmění', () => {
    const f = fixture();
    const before = f.model;
    const p = joinPreviewModel(f.model)!;
    expect(f.model).toBe(before);
    const walls = Object.values(p.model.elements).filter((e) => e.category === 'wall');
    expect(walls).toHaveLength(7);
    expect(Object.values(p.model.elements).filter((e) => e.category === 'slab')).toHaveLength(1);
    expect(Object.keys(p.model.relations).length).toBeGreaterThanOrEqual(6);
    expect(Object.values(p.model.sections).filter((s) => s.kind === 'section')).toHaveLength(1);
    expect(drawView(p.model, p.viewId).primitives.some((x) => x.kind === 'hatch')).toBe(true);
    expect(drawSection(p.model, p.sectionId!).primitives.length).toBeGreaterThan(0);
  });

  it('posun úrovně se v náhledu hned projeví (jiná kresba půdorysu)', () => {
    const f = fixture();
    const plan = () => {
      const p = joinPreviewModel(f.model)!;
      return JSON.stringify(drawView(p.model, p.viewId).primitives);
    };
    const before = plan();
    const ins = f.model.joinPriorities.levels.find((l) => l.name === 'Tepelná izolace')!.id;
    f.run('material.movePriorityLevel', { levelId: ins, index: 0 });
    expect(plan()).not.toBe(before);
  });
});
