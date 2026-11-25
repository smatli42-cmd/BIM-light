// Rozteče šraf podle praxe k ČSN 01 3406 / 01 3420 (podklad uživatele, katalog šraf): rovnoběžné šrafy
// 1,5–2 mm na papíře, nikdy pod 0,7 mm (ani pod dvojnásobek tloušťky čáry), aby se při tisku neslévaly.
import { describe, expect, it } from 'vitest';
import { HATCH_LIBRARY } from './registry.ts';
import type { Hatch, LineFamily } from './types.ts';

/** Nejmenší kolmá vzdálenost sousedních čar mezi všemi čárovými rodinami šrafy se stejným úhlem. */
function minGaps(h: Hatch): number[] {
  const byAngle = new Map<number, LineFamily[]>();
  for (const f of h.families)
    if (f.kind === 'lines') byAngle.set(f.angle % 180, [...(byAngle.get(f.angle % 180) ?? []), f]);
  return [...byAngle.values()].map((fs) => {
    const pos = fs.flatMap((f) =>
      Array.from({ length: Math.ceil(40 / f.spacing) }, (_, k) => k * f.spacing + (f.shift ?? 0)),
    );
    const sorted = [...new Set(pos.map((p) => Math.round(p * 1000) / 1000))].sort((a, b) => a - b);
    return Math.min(...sorted.slice(1).map((p, i) => p - (sorted[i] as number)));
  });
}

const byId = (id: string) => HATCH_LIBRARY.find((h) => h.id === id) as Hatch;

/** Základní šrafy z rovnoběžných čar (zdivo, beton, zemina…): rozteč 1,5–2 mm jako v 1 : 50. */
/** Kontroluje se nejhustší směr; druhý směr může být řidší (zdivo 45° po 2 mm, 135° po 4 mm). */
const PARALLEL = [
  'hatch.obecne',
  'hatch.teren',
  'hatch.zasypy',
  'hatch.beton-vyztuzeny',
  'hatch.beton-prosty',
  'hatch.zdivo',
  'hatch.zdivo-mrizka',
  'hatch.zdivo-carkovana',
  'hatch.zdivo-svislice-sikme',
  'hatch.sendvic',
  'hatch.plasty',
  'hatch.krytina',
];

describe('katalog-sraf-materialu: rozteče šraf (praxe k ČSN 01 3406)', () => {
  it.each(PARALLEL)('rovnoběžné šrafy 1,5–2 mm: %s', (id) => {
    const g = Math.min(...minGaps(byId(id)));
    expect(g).toBeGreaterThanOrEqual(1.5);
    expect(g).toBeLessThanOrEqual(2);
  });

  it.each(HATCH_LIBRARY.map((h) => [h.name, h] as const))(
    'rozteč čar ani rastru neklesne pod 0,7 mm (2 × 0,18 mm): %s',
    (_n, h) => {
      for (const g of minGaps(h)) expect(g).toBeGreaterThanOrEqual(0.7 - 1e-9);
      for (const f of h.families)
        if (f.kind === 'marks' || f.kind === 'motif')
          expect(Math.min(f.dx, f.dy)).toBeGreaterThanOrEqual(0.7);
    },
  );
});
