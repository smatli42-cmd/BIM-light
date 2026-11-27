import { describe, expect, it } from 'vitest';
import { fixture } from '../testing/fixture.ts';
import { projectV23toV24 } from './migrate-v23.ts';
import { VIEW3D_LOOK } from './types.ts';

const first = (f: ReturnType<typeof fixture>) => Object.keys(f.model.views3d)[0]!;

describe('3D náhled / lišta podle Arditu: projekce, režim, slunce, řez a mřížka jsou data 3D pohledu', () => {
  it('nový 3D pohled: perspektiva, materiály, bez stínů, bez řezu, bez mřížky', () => {
    const f = fixture();
    expect(f.model.views3d[first(f)]).toMatchObject(VIEW3D_LOOK);
  });

  it('příkazy view3d.setProjection / setRenderMode / setGrid; neznámou hodnotu odmítnou', () => {
    const f = fixture();
    const viewId = first(f);
    f.run('view3d.setProjection', { viewId, projection: 'axonometric' });
    f.run('view3d.setRenderMode', { viewId, mode: 'sketch' });
    f.run('view3d.setGrid', { viewId, grid: true });
    expect(f.model.views3d[viewId]).toMatchObject({
      projection: 'axonometric',
      renderMode: 'sketch',
      grid: true,
    });
    expect(f.editor.execute('view3d.setRenderMode', { viewId, mode: 'neon' }).ok).toBe(false);
    f.editor.undo();
    expect(f.model.views3d[viewId]!.grid).toBe(false);
  });

  it('slunce: mění jen uvedené položky, azimut se srovná do 0–360, výšku nad 90° odmítne', () => {
    const f = fixture();
    const viewId = first(f);
    f.run('view3d.setSun', { viewId, sun: { shadows: true, azimuth: -90 } });
    expect(f.model.views3d[viewId]!.sun).toMatchObject({ shadows: true, azimuth: 270, altitude: 40 });
    expect(f.editor.execute('view3d.setSun', { viewId, sun: { altitude: 95 } }).ok).toBe(false);
    expect(f.editor.execute('view3d.setSun', { viewId, sun: { time: 'poledne' } }).ok).toBe(false);
  });

  it('rovina řezu: směr se znormuje, nulový směr odmítne, null řez vypne', () => {
    const f = fixture();
    const viewId = first(f);
    const origin = { x: 1000, y: 0, z: 0 };
    f.run('view3d.setCutPlane', { viewId, plane: { origin, normal: { x: 0, y: 5, z: 0 } } });
    expect(f.model.views3d[viewId]!.cutPlane).toEqual({ origin, normal: { x: 0, y: 1, z: 0 } });
    const zero = { origin, normal: { x: 0, y: 0, z: 0 } };
    expect(f.editor.execute('view3d.setCutPlane', { viewId, plane: zero }).ok).toBe(false);
    f.run('view3d.setCutPlane', { viewId, plane: null });
    expect(f.model.views3d[viewId]!.cutPlane).toBeNull();
  });

  it('základ 9: migrace 23 → 24 doplní výchozí vzhled, uložené hodnoty nechá', () => {
    const out = projectV23toV24({ views3d: { a: { id: 'a' }, b: { id: 'b', renderMode: 'white' } } });
    const v = out['views3d'] as Record<string, Record<string, unknown>>;
    expect(v['a']).toMatchObject(VIEW3D_LOOK);
    expect(v['b']!['renderMode']).toBe('white');
  });
});
