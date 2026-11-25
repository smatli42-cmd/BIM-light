import { beforeAll, describe, expect, it } from 'vitest';
import * as WebIFC from 'web-ifc';
import { fixture, room } from '../../core/src/testing/fixture.ts';
import { exportIfc } from './export.ts';

const api = new WebIFC.IfcAPI();
beforeAll(async () => {
  await api.Init();
});

function open(text: string) {
  const id = api.OpenModel(Uint8Array.from(text, (ch) => ch.charCodeAt(0)));
  const lines = (type: number) => {
    const v = api.GetLineIDsWithType(id, type);
    return Array.from({ length: v.size() }, (_, i) => api.GetLine(id, v.get(i)));
  };
  return { id, lines, close: () => api.CloseModel(id) };
}

describe('plan-steny / Z4: export otvorů do IFC (ověřeno knihovnou web-ifc)', () => {
  it('plan-steny / Z4: průchozí otvor a nika jako IfcOpeningElement + IfcRelVoidsElement ke stěně', () => {
    const f = fixture();
    const typeId = f.type('Obvodová zateplená 465');
    const [, top] = room(f);
    f.run('wall.setType', { wallIds: [top], typeId });
    const [o] = f.run('opening.create', { wallId: top, offset: 1000, width: 1200 });
    const [n] = f.run('opening.create', { wallId: top, offset: 3000, width: 600, kind: 'niche', depth: 100 });
    const m = open(exportIfc(f.model));
    const ops = m.lines(WebIFC.IFCOPENINGELEMENT);
    expect(ops.map((x) => x.GlobalId.value).sort()).toEqual([o, n].sort());
    expect(ops.map((x) => x.PredefinedType.value).sort()).toEqual(['OPENING', 'RECESS']);
    const voids = m.lines(WebIFC.IFCRELVOIDSELEMENT);
    expect(voids).toHaveLength(2);
    const wallIds = voids.map((v) => api.GetLine(m.id, v.RelatingBuildingElement.value).GlobalId.value);
    expect(new Set(wallIds)).toEqual(new Set([top]));
    let meshes = 0;
    api.StreamAllMeshes(m.id, (mesh) => {
      if (mesh.geometries.size() > 0) meshes++;
    });
    expect(meshes).toBe(4);
    m.close();
  });

  it('plan-steny / Z4: tělo stěny je bez otvorů (výřez dělá IfcOpeningElement)', () => {
    const f = fixture();
    const w = f.line({ x: 0, y: 0 }, { x: 6000, y: 0 });
    const before = exportIfc(f.model).match(/IFCARBITRARYCLOSEDPROFILEDEF/g)?.length;
    f.run('opening.create', { wallId: w, offset: 2000, width: 1200 });
    const after = exportIfc(f.model).match(/IFCARBITRARYCLOSEDPROFILEDEF/g)?.length;
    expect(after).toBe((before ?? 0) + 1);
  });
});
