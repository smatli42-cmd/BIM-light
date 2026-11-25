import { beforeAll, describe, expect, it } from 'vitest';
import * as WebIFC from 'web-ifc';
import { fixture } from '../../core/src/testing/fixture.ts';
import { exportIfc } from './export.ts';

const api = new WebIFC.IfcAPI();
beforeAll(async () => {
  await api.Init();
});

describe('plan-steny / Z5: export obloukové stěny do IFC (ověřeno knihovnou web-ifc)', () => {
  it('osa jako IfcTrimmedCurve na IfcCircle, otvor v oblouku, geometrie se načte', () => {
    const f = fixture();
    const [w] = f.run('wall.create', {
      storeyId: f.storeyId,
      typeId: f.type('Obvodová zateplená 465'),
      path: { kind: 'arc', start: { x: -5000, y: 0 }, end: { x: 5000, y: 0 }, bulge: -1 },
    });
    f.run('opening.create', { wallId: w, offset: 7000, width: 1200, height: 1200, sill: 900 });
    const text = exportIfc(f.model);
    const id = api.OpenModel(Uint8Array.from(text, (ch) => ch.charCodeAt(0)));
    const ids = (t: number) => api.GetLineIDsWithType(id, t);
    expect(ids(WebIFC.IFCTRIMMEDCURVE).size()).toBe(1);
    const circle = api.GetLine(id, ids(WebIFC.IFCCIRCLE).get(0));
    expect(circle.Radius.value).toBeCloseTo(5000, 6);
    const trimmed = api.GetLine(id, ids(WebIFC.IFCTRIMMEDCURVE).get(0));
    expect(trimmed.SenseAgreement.value).toBe(false);
    expect(ids(WebIFC.IFCOPENINGELEMENT).size()).toBe(1);
    let meshes = 0;
    api.StreamAllMeshes(id, (mesh) => {
      if (mesh.geometries.size() > 0) meshes++;
    });
    expect(meshes).toBe(1);
    api.CloseModel(id);
  });
});
