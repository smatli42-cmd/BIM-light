import { describe, expect, it } from 'vitest';
import { fixture } from '../testing/fixture.ts';
import { bandThickness } from '../wall/layers.ts';
import { bandWithDelta, coreGroups, resizableLayerIndex, sameComposition } from './composition.ts';
import { WALL_TYPE_LIBRARY } from './library.ts';
import { projectV2toV3 } from './migrate-v2.ts';
import type { HeightBand, WallLayer, WallType } from './types.ts';
import { wallTypeErrors } from './validate.ts';

const L = (fn: WallLayer['function'], thickness: number, materialId = 'm'): WallLayer => ({
  materialId,
  thickness,
  function: fn,
  extendTop: 0,
  extendBottom: 0,
});
const T = (layers: WallLayer[], bands?: HeightBand[]): WallType => ({
  id: 't',
  name: 'Test',
  bands: bands ?? [{ height: null, layers }],
});
const ok = () => true;

describe('plán stěn Z1 / validace typu', () => {
  it('platný typ (omítka, zdivo, izolace) nemá chyby', () => {
    expect(wallTypeErrors(T([L('finish', 15), L('core', 300), L('insulation', 150)]), ok)).toEqual([]);
  });

  it('jádro musí být jedna souvislá skupina vrstev', () => {
    const t = T([L('core', 100), L('insulation', 50), L('core', 100)]);
    expect(coreGroups(t.bands[0]!.layers)).toBe(2);
    expect(wallTypeErrors(t, ok).join()).toMatch(/souvislá/);
    expect(wallTypeErrors(T([L('core', 100), L('core', 50)]), ok)).toEqual([]);
  });

  it('tloušťka vrstvy musí být kladná', () => {
    expect(wallTypeErrors(T([L('core', 0)]), ok).join()).toMatch(/kladná/);
    expect(wallTypeErrors(T([L('core', -5)]), ok).join()).toMatch(/kladná/);
  });

  it('materiál vrstvy musí existovat', () => {
    expect(wallTypeErrors(T([L('core', 100, 'x')]), (id) => id !== 'x').join()).toMatch(/Materiál/);
  });

  it('výškové pásy: poslední sahá do vršku, ostatní mají kladnou výšku (data umí víc pásů)', () => {
    const two: HeightBand[] = [
      { height: 2000, layers: [L('core', 80)] },
      { height: null, layers: [L('core', 115)] },
    ];
    expect(wallTypeErrors(T([], two), ok)).toEqual([]);
    expect(wallTypeErrors(T([], [{ height: 500, layers: [L('core', 80)] }]), ok).join()).toMatch(/Poslední/);
    expect(wallTypeErrors(T([], []), ok).join()).toMatch(/pás/);
  });
});

describe('plán stěn Z1 / skladba a tloušťka', () => {
  it('součet tloušťek vrstev = tloušťka stěny', () => {
    expect(
      bandThickness({ height: null, layers: [L('finish', 15), L('core', 300), L('insulation', 150)] }),
    ).toBe(465);
  });

  it('změna tloušťky mění nejtlustší jádro, bez jádra nejtlustší vrstvu', () => {
    const multi = { height: null, layers: [L('finish', 15), L('core', 50), L('core', 200), L('finish', 15)] };
    expect(resizableLayerIndex(multi)).toBe(2);
    const noCore = { height: null, layers: [L('finish', 15), L('insulation', 100), L('finish', 15)] };
    expect(resizableLayerIndex(noCore)).toBe(1);
    const thicker = bandWithDelta(multi, 100);
    expect(thicker.layers.map((l) => l.thickness)).toEqual([15, 50, 300, 15]);
  });

  it('stejná skladba nezávisí na názvu ani původu', () => {
    const a = T([L('core', 300)]);
    expect(sameComposition(a.bands, { ...a, name: 'Jiný' }.bands)).toBe(true);
    expect(sameComposition(a.bands, T([L('core', 301)]).bands)).toBe(false);
  });
});

describe('plán stěn Z1 / knihovna typů', () => {
  it('výchozí knihovna má 6–8 typů a každý je v novém projektu platný', () => {
    expect(WALL_TYPE_LIBRARY.length).toBeGreaterThanOrEqual(6);
    expect(WALL_TYPE_LIBRARY.length).toBeLessThanOrEqual(8);
    const f = fixture();
    for (const t of Object.values(f.model.wallTypes))
      expect(
        wallTypeErrors(t, (id) => !!f.model.materials[id]),
        t.name,
      ).toEqual([]);
  });

  it('základ 21: typ v projektu je kopie s odkazem na původ (knihovna + klíč + verze)', () => {
    const f = fixture();
    const t = f.model.wallTypes[f.type('Obvodová zateplená 465')]!;
    expect(t.source).toEqual({ libraryId: 'bim-light-wall-types', itemId: 'external-465', version: 1 });
  });
});

describe('plán stěn Z1 / migrace', () => {
  it('základ 9: projekt ve verzi 2 dostane u vrstev prodloužení nahoře a dole 0', () => {
    const v2 = {
      schemaVersion: 2,
      wallTypes: {
        t: {
          id: 't',
          name: 'A',
          bands: [{ height: null, layers: [{ materialId: 'm', thickness: 300, function: 'core' }] }],
        },
      },
    };
    const v3 = projectV2toV3(v2) as unknown as { wallTypes: Record<string, WallType> };
    expect(v3.wallTypes['t']!.bands[0]!.layers[0]).toEqual(L('core', 300));
  });
});
