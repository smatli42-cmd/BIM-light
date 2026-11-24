import { describe, expect, it } from 'vitest';
import { fixture } from '../testing/fixture.ts';
import { allWallGeometry } from './geometry.ts';
import { teeGaps } from './tee-gaps.ts';

/**
 * Hostitel „Obvodová zateplená 465“ vodorovně: omítka y 0..15, zdivo 15..315, EPS 315..465.
 * Příčka (Zdivo 300) zevnitř (y < 0) napojená v T, líce x = 2700 a 3000.
 */
function scene(fromOutside = false) {
  const f = fixture();
  const host = f.line({ x: 0, y: 0 }, { x: 6000, y: 0 }, { typeId: f.type('Obvodová zateplená 465') });
  const y = fromOutside ? 3000 : -3000;
  const tee = f.line(
    { x: 3000, y },
    { x: 3000, y: fromOutside ? 465 : 0 },
    {
      connections: [{ end: 'end', wallId: host, at: 'ATPATH' }],
    },
  );
  return { f, host, tee };
}

describe('rozhodnutí 5 / katalog 6.2: napojení v T podle priority materiálů', () => {
  it('jádro příčky projde omítkou hostitele až k jeho jádru (jádro na jádro)', () => {
    const { f, tee } = scene();
    const g = allWallGeometry(f.model, f.storeyId).get(tee)!;
    expect(g.faces.ref.end.y).toBeCloseTo(15, 6);
    expect(g.faces.opp.end.y).toBeCloseTo(15, 6);
  });

  it('líc omítky hostitele se v místě T přeruší, hranice omítka / zdivo zůstane', () => {
    const { f, host } = scene();
    const geoms = allWallGeometry(f.model, f.storeyId);
    const gaps = teeGaps(f.model, geoms.get(host)!, geoms);
    expect(gaps.ref).toHaveLength(1);
    const [a, b] = gaps.ref![0]!;
    expect([a * 6000, b * 6000].map((v) => Math.round(v))).toEqual([2700, 3000]);
    expect(gaps.layers?.[0] ?? []).toEqual([]);
  });

  it('jádro hostitele se nikdy neprořízne: zvenku příčka končí na líci jádra, izolace se přeruší', () => {
    const { f, host, tee } = scene(true);
    const geoms = allWallGeometry(f.model, f.storeyId);
    expect(geoms.get(tee)!.faces.ref.end.y).toBeCloseTo(315, 6);
    const gaps = teeGaps(f.model, geoms.get(host)!, geoms);
    expect(gaps.opp).toHaveLength(1);
    expect(gaps.layers?.[1] ?? []).toEqual([]);
  });
});
