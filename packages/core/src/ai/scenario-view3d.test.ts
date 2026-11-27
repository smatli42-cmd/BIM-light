// AI scénář: 3D pohled jen JSON voláními nástrojů – nový pohled, podlaží, ořezový kvádr, fáze, výpis.
import { describe, expect, it } from 'vitest';
import { must, room, start } from './scenario-helpers.ts';

interface View3dRow {
  id: string;
  name: string;
  storeyNames: string[] | null;
  sectionBox: unknown;
  phaseFilterId: string | null;
}

describe('AI scénář: 3D pohled', () => {
  it('AI vytvoří 3D pohled jednoho podlaží s ořezem, zapne bourací práce a ořez zase vypne', () => {
    const c = start();
    room(c);
    const [id] = c.ai.call<string[]>('view3d.create', { name: 'Kontrola 1.NP' });
    c.ai.call('view3d.setStoreys', { viewId: id, storeyIds: [c.storeyId] });
    const box = { min: { x: -500, y: -500, z: 0 }, max: { x: 6500, y: 4500, z: 1200 } };
    c.ai.call('view3d.setSectionBox', { viewId: id, sectionBox: box });
    const info = c.ai.call<{ phaseFilters: { id: string; name: string }[] }>('view.info', {
      viewId: c.viewId,
    });
    const demolition = must(info.phaseFilters.find((p) => p.name.includes('bourací')));
    c.ai.call('view3d.setPhaseFilter', { viewId: id, filterId: demolition.id });
    let row = must(c.ai.call<View3dRow[]>('view3d.list').find((v) => v.id === id));
    expect(row).toMatchObject({ name: 'Kontrola 1.NP', storeyNames: ['1.NP'], sectionBox: box });
    expect(row.phaseFilterId).toBe(demolition.id);
    c.ai.call('view3d.setSectionBox', { viewId: id, sectionBox: null });
    row = must(c.ai.call<View3dRow[]>('view3d.list').find((v) => v.id === id));
    expect(row.sectionBox).toBeNull();
    expect(c.ai.call<View3dRow[]>('view3d.list')).toHaveLength(2);
  });
});
