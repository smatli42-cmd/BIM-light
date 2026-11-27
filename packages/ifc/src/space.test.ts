import { beforeAll, describe, expect, it } from 'vitest';
import * as WebIFC from 'web-ifc';
import { vec } from '../../core/src/geometry/index.ts';
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

describe('prvky stavby 9: místnost v IFC jako IfcSpace (ověřeno knihovnou web-ifc)', () => {
  it('prvky stavby 9: IfcSpace s číslem, názvem, obrysem, výškou, Pset_SpaceCommon a Qto pod podlažím', () => {
    const f = fixture();
    room(f);
    const [id] = f.run('room.create', { storeyId: f.storeyId, point: vec(2000, 1500), name: 'Pokoj' });
    const m = open(exportIfc(f.model));
    const spaces = m.lines(WebIFC.IFCSPACE);
    expect(spaces.map((s) => [s.GlobalId.value, s.Name.value, s.LongName.value])).toEqual([
      [id, '1.01', 'Pokoj'],
    ]);
    const solid = m.lines(WebIFC.IFCEXTRUDEDAREASOLID).find((e) => Math.abs(e.Depth.value - 3000) < 1e-6);
    expect(solid).toBeTruthy();
    const agg = m
      .lines(WebIFC.IFCRELAGGREGATES)
      .find((r) =>
        r.RelatedObjects.some((o: { value: number }) => api.GetLine(m.id, o.value).GlobalId?.value === id),
      );
    expect(api.GetLine(m.id, agg.RelatingObject.value).Name.value).toBe('1.NP');
    const psets = m.lines(WebIFC.IFCPROPERTYSET).map((p) => p.Name.value);
    expect(psets).toContain('Pset_SpaceCommon');
    const area = m.lines(WebIFC.IFCQUANTITYAREA).find((q) => q.Name.value === 'NetFloorArea');
    expect(area.AreaValue.value).toBe(12);
    m.close();
  });

  it('ČSN 73 4301: pilíř uvnitř je v IFC vnitřní křivka profilu (IfcArbitraryProfileDefWithVoids)', () => {
    const f = fixture();
    room(f);
    f.line(vec(1000, 1500), vec(1300, 1500), { referenceLine: 'axis' });
    f.run('room.create', { storeyId: f.storeyId, point: vec(3000, 500) });
    const m = open(exportIfc(f.model));
    expect(m.lines(WebIFC.IFCARBITRARYPROFILEDEFWITHVOIDS)).toHaveLength(1);
    m.close();
  });
});
