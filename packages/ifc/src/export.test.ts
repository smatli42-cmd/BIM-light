import { beforeAll, describe, expect, it } from 'vitest';
import * as WebIFC from 'web-ifc';
import { fixture, room, type Fixture } from '../../core/src/testing/fixture.ts';
import { exportIfc } from './export.ts';
import { real, str } from './step.ts';

const api = new WebIFC.IfcAPI();
beforeAll(async () => {
  await api.Init();
});

/** Dům: 1.NP s místností ze zateplené stěny (tři vrstvy) + 2.NP, jedna stěna přes dvě podlaží. */
function house(): Fixture & { tall: string } {
  const f = fixture();
  f.run('storey.create', { name: '2.NP', elevation: 3000, height: 3000 });
  const typeId = f.type('Obvodová zateplená 465');
  for (const id of room(f)) f.run('wall.setType', { wallIds: [id], typeId });
  const tall = f.line(
    { x: 8000, y: 0 },
    { x: 8000, y: 4000 },
    {
      height: { baseStoreyId: f.storeyId, baseOffset: 0, top: { kind: 'storey', storeys: 2, offset: 0 } },
      status: 'existing',
    },
  );
  return Object.assign(f, { tall });
}

/** Výstup je čisté ASCII (čeština je kódovaná), takže stačí převést znak = bajt. */
function open(text: string) {
  expect(/^[\x20-\x7e\n]*$/.test(text)).toBe(true);
  const id = api.OpenModel(Uint8Array.from(text, (ch) => ch.charCodeAt(0)));
  const lines = (type: number) => {
    const v = api.GetLineIDsWithType(id, type);
    return Array.from({ length: v.size() }, (_, i) => api.GetLine(id, v.get(i)));
  };
  return { id, lines, close: () => api.CloseModel(id) };
}

describe('plan-steny / Z3: minimální export IFC (ověřeno knihovnou web-ifc)', () => {
  it('plan-steny / Z3: soubor jde otevřít a má projekt, budovu, podlaží a stěny', () => {
    const f = house();
    const m = open(exportIfc(f.model));
    expect(m.lines(WebIFC.IFCPROJECT)).toHaveLength(1);
    expect(m.lines(WebIFC.IFCSITE)).toHaveLength(1);
    expect(m.lines(WebIFC.IFCBUILDING)).toHaveLength(1);
    expect(m.lines(WebIFC.IFCBUILDINGSTOREY).map((s) => s.Name.value)).toEqual(['1.NP', '2.NP']);
    const walls = m.lines(WebIFC.IFCWALL);
    expect(walls).toHaveLength(5);
    expect(walls.map((w) => w.GlobalId.value).sort()).toEqual(Object.keys(f.model.elements).sort());
    let meshes = 0;
    api.StreamAllMeshes(m.id, (mesh) => {
      if (mesh.geometries.size() > 0) meshes++;
    });
    expect(meshes).toBe(5);
    m.close();
  });

  it('plan-steny / Z3: skladba se třemi vrstvami jako IfcMaterialLayerSet a Usage', () => {
    const f = house();
    const m = open(exportIfc(f.model));
    const sets = m.lines(WebIFC.IFCMATERIALLAYERSET);
    const zatepl = sets.find((s) => s.LayerSetName.value === 'Obvodová zateplená 465');
    expect(zatepl?.MaterialLayers).toHaveLength(3);
    const layers = m.lines(WebIFC.IFCMATERIALLAYER).map((l) => l.LayerThickness.value);
    expect(layers).toEqual(expect.arrayContaining([15, 300, 150]));
    expect(m.lines(WebIFC.IFCMATERIALLAYERSETUSAGE)).toHaveLength(5);
    expect(m.lines(WebIFC.IFCWALLTYPE).length).toBe(2);
    m.close();
  });

  it('plan-steny / Z3: výška stěny = hloubka vytažení; stěna přes dvě podlaží 6000 mm', () => {
    const f = house();
    const m = open(exportIfc(f.model));
    const depths = m.lines(WebIFC.IFCEXTRUDEDAREASOLID).map((s) => s.Depth.value);
    expect(depths.filter((d) => d === 3000)).toHaveLength(4);
    expect(depths).toContain(6000);
    f.run('storey.update', { storeyId: f.storeyId, height: 3100 });
    const m2 = open(exportIfc(f.model));
    expect(m2.lines(WebIFC.IFCEXTRUDEDAREASOLID).map((s) => s.Depth.value)).toContain(6100);
    m.close();
    m2.close();
  });

  it('plan-steny / Z3: stav jako vlastnost Status (Pset_WallCommon)', () => {
    const f = house();
    const m = open(exportIfc(f.model));
    const values = m
      .lines(WebIFC.IFCPROPERTYENUMERATEDVALUE)
      .flatMap((p) => p.EnumerationValues.map((v: { value: string }) => v.value));
    expect(values.filter((v) => v === 'NEW')).toHaveLength(4);
    expect(values).toContain('EXISTING');
    m.close();
  });

  it('plan-steny / Z3: opakovaný export dá stejný soubor (GlobalId stabilní)', () => {
    const f = house();
    expect(exportIfc(f.model)).toBe(exportIfc(f.model));
    const gids = (t: string) => [...t.matchAll(/^#\d+=IFC\w+\('([^']{22})'/gm)].map((x) => x[1]);
    const a = gids(exportIfc(f.model));
    expect(new Set(a).size).toBe(a.length);
  });

  it('plan-steny / Z3: zápis STEP – reálná čísla s tečkou, čeština kódovaná', () => {
    expect([real(3000), real(1.5), real(-0), real(1e-5)]).toEqual(['3000.', '1.5', '0.', '0.00001']);
    expect(str("Příčka 'A'").raw).toBe("'P\\X2\\0159\\X0\\\\X2\\00ED\\X0\\\\X2\\010D\\X0\\ka ''A'''");
  });
});
