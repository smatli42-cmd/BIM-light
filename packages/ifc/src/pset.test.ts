import { beforeAll, describe, expect, it } from 'vitest';
import * as WebIFC from 'web-ifc';
import { vec } from '@bim-light/core';
import { fixture } from '../../core/src/testing/fixture.ts';
import { exportIfc } from './export.ts';

const api = new WebIFC.IfcAPI();
beforeAll(async () => {
  await api.Init();
});

type Line = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/** Otevře export ve web-ifc a vrátí čtení řádků podle typu i podle čísla. */
function open(text: string) {
  const id = api.OpenModel(Uint8Array.from(text, (ch) => ch.charCodeAt(0)));
  const lines = (type: number): Line[] => {
    const v = api.GetLineIDsWithType(id, type);
    return Array.from({ length: v.size() }, (_, i) => api.GetLine(id, v.get(i)));
  };
  const line = (ref: { value: number }): Line => api.GetLine(id, ref.value);
  return { lines, line, close: () => api.CloseModel(id) };
}

/** Hodnoty sady vlastností jako { název: hodnota }. */
function psetValues(m: ReturnType<typeof open>, pset: Line): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const ref of pset.HasProperties) {
    const p = m.line(ref);
    out[p.Name.value] = p.NominalValue?.value ?? p.EnumerationValues?.[0]?.value;
  }
  return out;
}

/** Obvodová stěna se třemi vrstvami (přepis požární odolnosti) a příčka. */
function model() {
  const f = fixture();
  const ext = f.line(vec(0, 0), vec(6000, 0), { typeId: f.type('Obvodová zateplená 465') });
  const part = f.line(vec(0, 3000), vec(6000, 3000), { typeId: f.type('Příčka 100') });
  f.run('wallType.setProperties', {
    typeId: f.type('Obvodová zateplená 465'),
    properties: { fireRating: 'REI 60 DP1', acousticRating: "R'w 52 dB" },
  });
  f.run('wall.setProperties', { wallIds: [ext], properties: { fireRating: 'REI 90 DP1' } });
  return { f, ext, part };
}

describe('plan-steny / Z7: úplný export IFC – vlastnosti a typ (ověřeno knihovnou web-ifc)', () => {
  it('plan-steny / Z7: instance má Pset_WallCommon s výslednými hodnotami (přepis vyhraje)', () => {
    const { f, ext } = model();
    const m = open(exportIfc(f.model));
    const rel = m
      .lines(WebIFC.IFCRELDEFINESBYPROPERTIES)
      .find((r) => r.RelatedObjects.some((o: { value: number }) => m.line(o).GlobalId.value === ext));
    const pset = rel && m.line(rel.RelatingPropertyDefinition);
    expect(pset?.Name.value).toBe('Pset_WallCommon');
    expect(psetValues(m, pset as Line)).toMatchObject({
      Reference: 'Obvodová zateplená 465',
      Status: 'NEW',
      LoadBearing: true,
      IsExternal: true,
      FireRating: 'REI 90 DP1',
      AcousticRating: "R'w 52 dB",
    });
    m.close();
  });

  it('plan-steny / Z7: typ nese Pset_WallCommon s hodnotami typu a PredefinedType podle funkce', () => {
    const { f } = model();
    const m = open(exportIfc(f.model));
    const types = m.lines(WebIFC.IFCWALLTYPE);
    const ext = types.find((t) => t.Name.value === 'Obvodová zateplená 465') as Line;
    const part = types.find((t) => t.Name.value === 'Příčka 100') as Line;
    expect(psetValues(m, m.line(ext.HasPropertySets[0]))).toMatchObject({
      FireRating: 'REI 60 DP1',
      IsExternal: true,
    });
    expect(ext.PredefinedType.value).toBe('STANDARD');
    expect(part.PredefinedType.value).toBe('PARTITIONING');
    expect(psetValues(m, m.line(part.HasPropertySets[0]))).toMatchObject({ LoadBearing: false });
    m.close();
  });

  it('plan-steny / Z7: základová stěna jako USERDEFINED s názvem druhu', () => {
    const { f, part } = model();
    f.run('wall.setProperties', { wallIds: [part], properties: { function: 'foundation' } });
    const m = open(exportIfc(f.model));
    const wall = m.lines(WebIFC.IFCWALL).find((w) => w.GlobalId.value === part) as Line;
    expect(wall.PredefinedType.value).toBe('USERDEFINED');
    expect(wall.ObjectType.value).toBe('Základová');
    m.close();
  });
});
