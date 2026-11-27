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

  it('AI přepne 3D pohled na axonometrii ve skice, zapne stíny 21. 6. v 15:00, řez a mřížku', () => {
    const c = start();
    room(c);
    const [id] = c.ai.call<string[]>('view3d.create', { name: 'Studie' });
    c.ai.call('view3d.setProjection', { viewId: id, projection: 'axonometric' });
    c.ai.call('view3d.setRenderMode', { viewId: id, mode: 'sketch' });
    c.ai.call('view3d.setSun', {
      viewId: id,
      sun: { shadows: true, mode: 'time', date: '2026-06-21', time: '15:00' },
    });
    const plane = { origin: { x: 3000, y: 2000, z: 0 }, normal: { x: 0, y: 1, z: 0 } };
    c.ai.call('view3d.setCutPlane', { viewId: id, plane });
    c.ai.call('view3d.setGrid', { viewId: id, grid: true });
    const row = must(
      c.ai.call<(View3dRow & Record<string, unknown>)[]>('view3d.list').find((v) => v.id === id),
    );
    expect(row).toMatchObject({
      projection: 'axonometric',
      renderMode: 'sketch',
      cutPlane: plane,
      grid: true,
    });
    // Odpoledne je slunce na jihozápadě, vysoko nad obzorem.
    expect(row['sunAzimuth']).toBeGreaterThan(220);
    expect(row['sunAzimuth']).toBeLessThan(260);
    expect(row['sunAltitude']).toBeGreaterThan(40);
  });
});
