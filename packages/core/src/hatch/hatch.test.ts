import { describe, expect, it } from 'vitest';
import { buildHatchLibrary, HATCH_GROUPS, HATCH_LIBRARY, validateHatches } from './registry.ts';
import { entry, lines } from './types.ts';

/** Seznam šraf z arditu (katalog šraf a materiálů), pořadí je závazné. */
const ARDIT = [
  'bez šrafy',
  'Obecné (bez rozlišení hmot)',
  'Terén (zemina)',
  'Zásypy a násypy',
  'Zeminy – kamenivo',
  'Zeminy – čárky',
  'Zeminy – šipky',
  'Štěrk',
  'Beton vyztužený (železobeton)',
  'Beton nevyztužený (prostý)',
  'Beton – kroužky',
  'Beton – trojúhelníky',
  'Beton – čárkovaná s kroužky',
  'Zdivo',
  'Zdivo – mřížka',
  'Zdivo – čárkovaná',
  'Zdivo – hustá mřížka',
  'Zdivo – svislice a šikmé',
  'Dílce (prefabrikáty)',
  'Dřevo',
  'Sendvičové konstrukce',
  'Sendvič – křížky',
  'Sendvič – kroužky',
  'Tepelná izolace',
  'Izolace obecná',
  'Akustická izolace',
  'Izolace – plástve',
  'Izolace – trojúhelníky',
  'Izolace – kroužky',
  'Izolace proti vodě (vyčerněná)',
  'Kámen (kromě zdiva)',
  'Kovy',
  'Sklo',
  'Ploché sklo',
  'Omítky, sádra, stěrky',
  'Sádrokarton',
  'Anhydrit (potěr)',
  'Plasty, pryž, pružný tmel',
  'Bourané konstrukce',
  'Krytina',
];

describe('katalog-sraf-materialu / knihovna šraf', () => {
  it('všech 40 šraf je v knihovně v pořadí ze seznamu', () => {
    expect(HATCH_LIBRARY.map((h) => h.name)).toEqual(ARDIT);
    expect(HATCH_LIBRARY.map((h) => h.order)).toEqual(ARDIT.map((_, i) => i + 1));
  });

  it('každá šrafa projde validací, id jsou jedinečná a varianty odkazují existující šrafu', () => {
    expect(validateHatches(HATCH_LIBRARY)).toEqual([]);
    expect(new Set(HATCH_LIBRARY.map((h) => h.id)).size).toBe(40);
    const ids = new Set(HATCH_LIBRARY.map((h) => h.id));
    expect(HATCH_LIBRARY.filter((h) => h.variantOf).every((h) => ids.has(h.variantOf!))).toBe(true);
  });

  it('13 šraf je odvozených (varianta jiné šrafy), jako v arditu', () => {
    expect(HATCH_LIBRARY.filter((h) => h.variantOf)).toHaveLength(13);
  });

  it('„bez šrafy“ je normální položka s prázdným seznamem rodin; izolace proti vodě je plná', () => {
    expect(HATCH_LIBRARY[0]?.families).toEqual([]);
    expect(HATCH_LIBRARY.find((h) => h.id === 'hatch.izolace-voda')?.solid).toBe(true);
  });

  it('základ 34: přidání šrafy záznamem do dat se objeví v knihovně bez změny kódu', () => {
    const extra = entry('ostatni')(41, 'hatch.vlastni', 'Vlastní šrafa', { families: [lines(30, 2)] });
    const lib = buildHatchLibrary([...HATCH_GROUPS, [extra]]);
    expect(lib).toHaveLength(41);
    expect(lib[40]?.name).toBe('Vlastní šrafa');
  });

  it('neplatná data knihovna odmítne (opakované id, záporná rozteč, varianta neexistující šrafy)', () => {
    const h = entry('ostatni');
    const bad = [
      h(1, 'hatch.a', 'A', { families: [lines(0, -1)] }),
      h(2, 'hatch.a', 'B', { variantOf: 'hatch.nic' }),
    ];
    const errors = validateHatches(bad);
    expect(errors.some((e) => e.includes('rozteč'))).toBe(true);
    expect(errors.some((e) => e.includes('opakuje'))).toBe(true);
    expect(errors.some((e) => e.includes('neexistující'))).toBe(true);
    expect(() => buildHatchLibrary([bad])).toThrow();
  });

  it('základ 34: šrafa nenese žádnou barvu (barva je u materiálu)', () => {
    expect(JSON.stringify(HATCH_LIBRARY)).not.toMatch(/#[0-9a-f]{3,8}|color/i);
  });
});
