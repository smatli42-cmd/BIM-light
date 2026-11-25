import { describe, expect, it } from 'vitest';
import { hatchPxPerMm, HATCH_MIN_PX_PER_MM } from './hatch.ts';

describe('základ 29: šrafy mají pevnou velikost na papíře', () => {
  it('základ 29: 1 mm papíru = měřítko × px na mm modelu (1 : 50, 0,1 px/mm → 5 px)', () => {
    expect(hatchPxPerMm(50, 0.1)).toBeCloseTo(5);
  });
  it('základ 29: šrafa se zvětšuje s přiblížením (dvojnásobný zoom → dvojnásobná rozteč)', () => {
    expect(hatchPxPerMm(50, 0.2)).toBeCloseTo(2 * hatchPxPerMm(50, 0.1));
  });
  it('základ 29: v měřítku 1 : 100 je šrafa při stejném zoomu dvakrát větší než v 1 : 50', () => {
    expect(hatchPxPerMm(100, 0.1)).toBeCloseTo(2 * hatchPxPerMm(50, 0.1));
  });
  it('katalog-sraf-materialu: při velkém oddálení se kreslí jen výplň (práh je kladný)', () => {
    expect(HATCH_MIN_PX_PER_MM).toBeGreaterThan(0);
  });
});
