import { beforeAll, describe, expect, it } from 'vitest';
import * as WebIFC from 'web-ifc';
import { fixture, type Fixture } from '../../core/src/testing/fixture.ts';
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

const typeId = (f: Fixture, name: string) =>
  Object.values(f.model.slabTypes).find((t) => t.name === name)!.id;

describe('základ 19 / D3: otvor v desce v IFC (ověřeno knihovnou web-ifc)', () => {
  it('D3: jeden otvor ve stropě i podlaze = dva IfcOpeningElement a IfcRelVoidsElement ke každé desce', () => {
    const f = fixture();
    const rect = { a: { x: 0, y: 0 }, b: { x: 6000, y: 4000 } };
    const [rc] = f.run('slab.create', { storeyId: f.storeyId, typeId: typeId(f, 'ŽB strop 250'), rect });
    const [fl] = f.run('slab.create', {
      storeyId: f.storeyId,
      typeId: typeId(f, 'Podlaha anhydrit 150'),
      rect,
    });
    const [o] = f.run('slabOpening.create', {
      storeyId: f.storeyId,
      rect: { a: { x: 1000, y: 1000 }, b: { x: 2000, y: 3000 } },
    });
    const m = open(exportIfc(f.model));
    const ops = m.lines(WebIFC.IFCOPENINGELEMENT);
    expect(ops).toHaveLength(2);
    expect(ops.map((x) => x.GlobalId.value)).toContain(o);
    const voids = m.lines(WebIFC.IFCRELVOIDSELEMENT);
    const hosts = voids.map((v) => api.GetLine(m.id, v.RelatingBuildingElement.value).GlobalId.value);
    expect(hosts.sort()).toEqual([rc, fl].sort());
    let meshes = 0;
    api.StreamAllMeshes(m.id, (mesh) => {
      if (mesh.geometries.size() > 0) meshes++;
    });
    expect(meshes).toBe(2);
    m.close();
  });
});
