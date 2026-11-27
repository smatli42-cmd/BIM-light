import { beforeAll, describe, expect, it } from 'vitest';
import * as WebIFC from 'web-ifc';
import { fixture, room, type Fixture } from '../../core/src/testing/fixture.ts';
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

describe('D1: export desek do IFC (ověřeno knihovnou web-ifc)', () => {
  it('rozhodnutí sekce 5 / D1: strop = IfcSlab FLOOR, podlaha = IfcCovering FLOORING, oba s typem, skladbou a tělem', () => {
    const f = fixture();
    room(f);
    const rect = { a: { x: 0, y: 0 }, b: { x: 4000, y: 3000 } };
    const [rc] = f.run('slab.create', { storeyId: f.storeyId, typeId: typeId(f, 'ŽB strop 250'), rect });
    const [fl] = f.run('slab.create', {
      storeyId: f.storeyId,
      typeId: typeId(f, 'Podlaha anhydrit 150'),
      rect,
    });
    const m = open(exportIfc(f.model));
    const slabs = m.lines(WebIFC.IFCSLAB);
    const covs = m.lines(WebIFC.IFCCOVERING);
    expect(slabs.map((s) => [s.GlobalId.value, s.PredefinedType.value])).toEqual([[rc, 'FLOOR']]);
    expect(covs.map((s) => [s.GlobalId.value, s.PredefinedType.value])).toEqual([[fl, 'FLOORING']]);
    expect(m.lines(WebIFC.IFCSLABTYPE)).toHaveLength(1);
    expect(m.lines(WebIFC.IFCCOVERINGTYPE)).toHaveLength(1);
    const usages = m
      .lines(WebIFC.IFCMATERIALLAYERSETUSAGE)
      .filter((u) => u.LayerSetDirection.value === 'AXIS3');
    expect(usages).toHaveLength(2);
    const rels = m.lines(WebIFC.IFCRELCONTAINEDINSPATIALSTRUCTURE);
    const contained = rels.flatMap((r) =>
      r.RelatedElements.map((e: { value: number }) => api.GetLine(m.id, e.value).GlobalId.value),
    );
    expect(contained).toEqual(expect.arrayContaining([rc, fl]));
    const psets = m.lines(WebIFC.IFCPROPERTYSET).map((p) => p.Name.value);
    expect(psets).toEqual(expect.arrayContaining(['Pset_SlabCommon', 'Pset_CoveringCommon']));
    let meshes = 0;
    api.StreamAllMeshes(m.id, (mesh) => {
      if (mesh.geometries.size() > 0) meshes++;
    });
    expect(meshes).toBe(6);
    m.close();
  });
});
