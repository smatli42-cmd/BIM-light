// Knihovna šraf, skupina „základní stavební“ (datová knihovna, základ 33).
// Rozměry jsou v mm NA PAPÍŘE, stejné ve všech měřítcích (základ 29). Hodnoty jsou výchozí, doladí se.

export interface HatchLine {
  /** Úhel čar ve stupních od osy X. */
  readonly angleDeg: number;
  /** Rozteč čar na papíře (mm). */
  readonly spacingMm: number;
  /** Čárkování na papíře (mm, střídavě čára/mezera); prázdné = plná čára. */
  readonly dashMm: readonly number[];
}

export interface HatchPattern {
  readonly id: string;
  readonly name: string;
  readonly lines: readonly HatchLine[];
}

const line = (angleDeg: number, spacingMm: number, dashMm: number[] = []): HatchLine => ({
  angleDeg,
  spacingMm,
  dashMm,
});

export const BASIC_HATCH_PATTERNS: readonly HatchPattern[] = [
  { id: 'none', name: 'Bez šrafy', lines: [] },
  { id: 'masonry', name: 'Zdivo', lines: [line(45, 1.5)] },
  { id: 'masonry-existing', name: 'Zdivo stávající', lines: [line(45, 1.5), line(135, 3)] },
  { id: 'concrete', name: 'Beton', lines: [line(45, 2, [1, 0.6])] },
  { id: 'reinforced-concrete', name: 'Železobeton', lines: [line(45, 1.2), line(45, 2.4, [0.3, 0.9])] },
  { id: 'insulation', name: 'Tepelná izolace', lines: [line(45, 1.5), line(135, 1.5)] },
  { id: 'wood', name: 'Dřevo', lines: [line(0, 1), line(90, 4, [1, 1])] },
  { id: 'plaster', name: 'Omítka', lines: [line(45, 0.8, [0.2, 0.6])] },
];

export const findHatchPattern = (id: string): HatchPattern | undefined =>
  BASIC_HATCH_PATTERNS.find((p) => p.id === id);
