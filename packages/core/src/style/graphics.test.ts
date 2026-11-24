import { describe, expect, it } from 'vitest';
import { fixture, type Fixture } from '../testing/fixture.ts';
import { elementFacts } from './conditions.ts';
import { resolveGraphics } from './graphics.ts';
import type { DisplaySettings, Rule } from './types.ts';

const combo = (f: Fixture, name: string) =>
  Object.values(f.model.display.overrideCombinations).find((c) => c.name === name)?.id ?? '';

function graphics(f: Fixture, wallId: string, display: DisplaySettings = f.model.display) {
  const view = f.model.views[f.viewId];
  if (!view) throw new Error('pohled chybí');
  return resolveGraphics(display, view, elementFacts(f.model, f.wall(wallId)));
}

/** Nastavení se dvěma vlastními pravidly ve zvolené kombinaci (pro test pořadí). */
function withRules(f: Fixture, rules: Rule[]): DisplaySettings {
  const d = f.model.display;
  const view = f.model.views[f.viewId];
  const comboId = d.styles[view?.styleId ?? '']?.overrideCombinationId ?? '';
  const target = d.overrideCombinations[comboId];
  if (!target) throw new Error('kombinace chybí');
  return {
    ...d,
    rules: { ...d.rules, ...Object.fromEntries(rules.map((r) => [r.id, r])) },
    overrideCombinations: {
      ...d.overrideCombinations,
      [comboId]: { ...target, ruleIds: rules.map((r) => r.id) },
    },
  };
}

const rule = (id: string, name: string, lineColor: string, extra: Partial<Rule> = {}): Rule => ({
  id,
  name,
  conditions: [{ property: 'category', op: 'eq', value: 'wall' }],
  effect: { lineColor },
  ...extra,
});

describe('rozhodnutí 4 / základ 11: funkce grafiky, pevné pořadí 6 pater', () => {
  it('patro 1: výchozí pero řezu stěny je 5 (velmi tlustá), šrafa z materiálu', () => {
    const f = fixture();
    const g = graphics(f, f.line({ x: 0, y: 0 }, { x: 5000, y: 0 }));
    expect(g.effect.cutPen).toBe(5);
    expect(g.why.cutPen.level).toBe(1);
  });

  it('patro 2: styl Studie dá stěně tmavou výplň a řekne proč', () => {
    const f = fixture();
    const g = graphics(f, f.line({ x: 0, y: 0 }, { x: 5000, y: 0 }));
    expect(g.effect.fillColor).toBe('#3d3d3d');
    expect(g.why.fillColor).toEqual({ level: 2, levelName: 'styl', source: 'styl Studie' });
  });

  it('katalog-pohledy / základ 30: pravidlo vyšší v pořadí přebije nižší a funkce vrátí, které rozhodlo', () => {
    const f = fixture();
    const id = f.line({ x: 0, y: 0 }, { x: 5000, y: 0 });
    const d = withRules(f, [rule('r1', 'Modře', '#0000ff'), rule('r2', 'Zeleně', '#00ff00')]);
    const g = graphics(f, id, d);
    expect(g.effect.lineColor).toBe('#0000ff');
    expect(g.why.lineColor).toEqual({ level: 3, levelName: 'pravidla', source: 'Modře' });
  });

  it('základ 30: vypnuté pravidlo a pravidlo s nesplněnou podmínkou se neuplatní', () => {
    const f = fixture();
    const id = f.line({ x: 0, y: 0 }, { x: 5000, y: 0 });
    const off = rule('r1', 'Vypnuté', '#0000ff', { disabled: true });
    const other = rule('r2', 'Jen sloupy', '#00ff00', {
      conditions: [{ property: 'category', op: 'eq', value: 'column' }],
    });
    expect(graphics(f, id, withRules(f, [off, other])).why.lineColor.level).toBe(2);
  });

  it('rozhodnutí 4: přepis prvku vždy vyhraje nad pravidly i stylem (patra 5 a 6)', () => {
    const f = fixture();
    const id = f.line({ x: 0, y: 0 }, { x: 5000, y: 0 });
    f.run('element.setGraphicOverride', {
      elementIds: [id],
      effect: { lineColor: '#123456', fillColor: null },
    });
    const d = withRules(f, [rule('r1', 'Modře', '#0000ff')]);
    expect(graphics(f, id, d).effect.lineColor).toBe('#123456');
    expect(graphics(f, id, d).why.lineColor.level).toBe(5);
    f.run('element.setGraphicOverride', {
      elementIds: [id],
      effect: { lineColor: '#ff00ff' },
      viewId: f.viewId,
    });
    const g = graphics(f, id, withRules(f, [rule('r1', 'Modře', '#0000ff')]));
    expect(g.effect.lineColor).toBe('#ff00ff');
    expect(g.why.lineColor.level).toBe(6);
    expect(g.effect.fillColor).toBeNull();
  });

  it('rozhodnutí 4: přepis jde zrušit jedním příkazem', () => {
    const f = fixture();
    const id = f.line({ x: 0, y: 0 }, { x: 5000, y: 0 });
    f.run('element.setGraphicOverride', { elementIds: [id], effect: { lineColor: '#123456' } });
    f.run('element.setGraphicOverride', { elementIds: [id], effect: null });
    expect(f.wall(id).graphicOverride).toBeUndefined();
  });

  it('rozhodnutí 6: fáze jsou předdefinovaná pravidla – bourací práce: bourané žlutě čárkovaně, nové skryté', () => {
    const f = fixture();
    const demolished = f.line({ x: 0, y: 0 }, { x: 5000, y: 0 }, { status: 'demolished' });
    const fresh = f.line({ x: 0, y: 2000 }, { x: 5000, y: 2000 }, { status: 'new' });
    f.run('view.setOverrideCombination', {
      viewId: f.viewId,
      combinationId: combo(f, 'Fáze – bourací práce'),
    });
    const g = graphics(f, demolished);
    expect(g.effect.lineType).toBe('dashed');
    expect(g.why.lineType.source).toBe('Bourání žlutě čárkovaně');
    expect(graphics(f, fresh).effect.visible).toBe(false);
  });

  it('patro 4: úprava pohledu přebije pravidla, ale ne přepis prvku', () => {
    const f = fixture();
    const id = f.line({ x: 0, y: 0 }, { x: 5000, y: 0 });
    const view = f.model.views[f.viewId];
    if (!view) throw new Error('pohled chybí');
    const local = { ...view, local: { categoryGraphics: { wall: { lineColor: '#777777' } } } };
    const d = withRules(f, [rule('r1', 'Modře', '#0000ff')]);
    const g = resolveGraphics(d, local, elementFacts(f.model, f.wall(id)));
    expect(g.effect.lineColor).toBe('#777777');
    expect(g.why.lineColor.level).toBe(4);
  });
});
