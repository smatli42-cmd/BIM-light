import { describe, expect, it } from 'vitest';
import { fixture } from '../../testing/fixture.ts';
import { savedViews, workingViewOf } from '../../view/working.ts';

describe('koncepce-rozhrani / 4: pracovní okno a uložené pohledy', () => {
  it('nový projekt i nové podlaží mají pracovní okno (saved: false)', () => {
    const f = fixture();
    expect(workingViewOf(f.model, f.storeyId)?.id).toBe(f.viewId);
    const [s2] = f.run('storey.create', { name: '2.NP', elevation: 3000, height: 3000 });
    expect(workingViewOf(f.model, s2 as string)?.saved).toBe(false);
  });

  it('Uložit pohled vezme nastavení okna; Načíst nastavení ho přepíše; Undo vrátí', () => {
    const f = fixture();
    f.run('view.setScale', { viewId: f.viewId, scale: 50 });
    const [v] = f.run('view.save', { viewId: f.viewId });
    const saved = f.model.views[v as string];
    expect(saved).toMatchObject({ saved: true, scale: 50, name: 'Půdorys 1.NP', storeyId: f.storeyId });
    expect(savedViews(f.model)).toHaveLength(1);
    f.run('view.setStyle', { viewId: f.viewId, styleId: f.style('Projekt') });
    f.run('view.loadSettings', { viewId: v, fromViewId: f.viewId });
    expect(f.model.views[v as string]?.styleId).toBe(f.style('Projekt'));
    f.editor.undo();
    expect(f.model.views[v as string]?.styleId).not.toBe(f.style('Projekt'));
    const [v2] = f.run('view.save', { viewId: f.viewId });
    expect(f.model.views[v2 as string]?.name).toBe('Půdorys 1.NP (2)');
  });

  it('pohled jde přejmenovat a smazat; pracovní okno smazat nejde', () => {
    const f = fixture();
    const [v] = f.run('view.save', { viewId: f.viewId, name: 'DSP půdorys' });
    f.run('view.rename', { viewId: v, name: 'PPS půdorys' });
    expect(f.model.views[v as string]?.name).toBe('PPS půdorys');
    f.run('view.delete', { viewId: v });
    expect(f.model.views[v as string]).toBeUndefined();
    const r = f.editor.execute('view.delete', { viewId: f.viewId });
    expect(r.ok).toBe(false);
  });
});
