import { describe, expect, it } from 'vitest';
import { parseProject, serializeProject } from '../persistence/project-file.ts';
import { fixture } from '../testing/fixture.ts';
import { wallHeight } from './resolve.ts';

describe('plan-steny / Z3: prodloužení vrstev nahoře a dole', () => {
  it('plan-steny / Z3: omítka pod strop (+200) a sokl pod podlahu (−150 dole = +150 pod spodek)', () => {
    const f = fixture();
    const typeId = f.type('Obvodová zateplená 465');
    f.run('wallType.updateLayer', { typeId, layerIndex: 0, extendTop: 200 });
    f.run('wallType.updateLayer', { typeId, layerIndex: 2, extendBottom: 150 });
    const id = f.line({ x: 0, y: 0 }, { x: 5000, y: 0 }, { typeId });
    const h = wallHeight(f.model, f.wall(id));
    expect(h).toMatchObject({ bottom: 0, top: 3000, height: 3000 });
    const layers = h.bands[0]?.layers.map((l) => [l.bottom, l.top]);
    expect(layers).toEqual([
      [0, 3200],
      [0, 3000],
      [-150, 3000],
    ]);
  });

  it('plan-steny / Z3: záporné prodloužení vrstvu zkrátí; výška se přepočítá se změnou podlaží', () => {
    const f = fixture();
    const typeId = f.type('Zdivo 300');
    f.run('wallType.updateLayer', { typeId, layerIndex: 0, extendTop: -250 });
    const id = f.line({ x: 0, y: 0 }, { x: 5000, y: 0 });
    f.run('storey.update', { storeyId: f.storeyId, height: 3100 });
    expect(wallHeight(f.model, f.wall(id)).bands[0]?.layers[0]?.top).toBe(2850);
  });

  it('základ 10 / plan-steny Z3: výškové pásy se poskládají od spodku, poslední do vršku', () => {
    const f = fixture();
    const matId = Object.keys(f.model.materials)[0];
    const layer = { materialId: matId, thickness: 300, function: 'core', extendTop: 100, extendBottom: 50 };
    const [typeId] = f.run('wallType.create', {
      name: 'Se soklem',
      bands: [
        { height: 500, layers: [layer] },
        { height: null, layers: [layer] },
      ],
    });
    const id = f.line({ x: 0, y: 0 }, { x: 5000, y: 0 }, { typeId });
    const h = wallHeight(f.model, f.wall(id));
    expect(h.bands.map((b) => [b.bottom, b.top])).toEqual([
      [0, 500],
      [500, 3000],
    ]);
    expect(h.bands[0]?.layers[0]).toMatchObject({ bottom: -50, top: 500 });
    expect(h.bands[1]?.layers[0]).toMatchObject({ bottom: 500, top: 3100 });
  });

  it('plan-steny / Z3: prodloužení přežije uložení a načtení projektu', () => {
    const f = fixture();
    const typeId = f.type('Zdivo 300');
    f.run('wallType.updateLayer', { typeId, layerIndex: 0, extendTop: 120 });
    const r = parseProject(serializeProject(f.model));
    expect(r.ok && r.model.wallTypes[typeId]?.bands[0]?.layers[0]?.extendTop).toBe(120);
  });
});
