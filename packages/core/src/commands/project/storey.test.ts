import { describe, expect, it } from 'vitest';
import { fixture } from '../../testing/fixture.ts';

describe('plan-steny / Z3: smazání podlaží', () => {
  it('plan-steny / Z3: podlaží se stěnou smazat nejde, hláška řekne kolik prvků tam je', () => {
    const f = fixture();
    const [s2] = f.run('storey.create', { name: '2.NP', elevation: 3000, height: 3000 });
    f.line({ x: 0, y: 0 }, { x: 5000, y: 0 }, { storeyId: s2 });
    f.line({ x: 0, y: 0 }, { x: 0, y: 3000 }, { storeyId: s2 });
    const r = f.editor.execute('storey.delete', { storeyId: s2 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message).toMatch(/2 prvků/);
    expect(f.model.storeys[s2 as string]).toBeTruthy();
  });

  it('plan-steny / Z3: podlaží, kterým prochází stěna přes dvě podlaží, smazat nejde', () => {
    const f = fixture();
    const [s2] = f.run('storey.create', { name: '2.NP', elevation: 3000, height: 3000 });
    f.line(
      { x: 0, y: 0 },
      { x: 5000, y: 0 },
      {
        height: { baseStoreyId: f.storeyId, baseOffset: 0, top: { kind: 'storey', storeys: 2, offset: 0 } },
      },
    );
    expect(f.editor.execute('storey.delete', { storeyId: s2 }).ok).toBe(false);
  });

  it('plan-steny / Z3: prázdné podlaží se smaže i s pohledy; poslední podlaží zůstane', () => {
    const f = fixture();
    const [s2] = f.run('storey.create', { name: '2.NP', elevation: 3000, height: 3000 });
    const [view] = f.run('view.create', { storeyId: s2, styleId: f.style('Projekt'), scale: 100 });
    f.run('storey.delete', { storeyId: s2 });
    expect(f.model.storeys[s2 as string]).toBeUndefined();
    expect(f.model.views[view as string]).toBeUndefined();
    expect(f.editor.execute('storey.delete', { storeyId: f.storeyId }).ok).toBe(false);
  });
});
