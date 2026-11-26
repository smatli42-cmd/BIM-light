// Výchozí volby nástrojů v sezení: rozměry nového otvoru (plán stěn Z4; mění je panel vpravo) a volby příkazů.
export interface OpeningDefaults {
  width: number;
  height: number;
  sill: number;
  kind: 'through' | 'niche';
  depth: number;
  side: 'ref' | 'opp';
}

/** Výchozí nový otvor: okno 1200 × 1500, parapet 900, průchozí (nika hloubky 150 z referenční strany). */
export const OPENING_DEFAULTS: Readonly<OpeningDefaults> = {
  width: 1200,
  height: 1500,
  sill: 900,
  kind: 'through',
  depth: 150,
  side: 'ref',
};

/** Volby příkazů nad výběrem (info box / okno příkazu): kopie, pole, mřížka, Změnit velikost. */
export const TOOL_OPTIONS = {
  copy: false,
  arrayCount: 3,
  arrayRadial: false,
  /** Rozteč mřížky v mm, 0 = vypnutá (katalog kreslení 2.6: mřížka není, jde zapnout). */
  grid: 0,
  /** Změnit velikost (Ctrl+K): měřítko v % a zda se mění i šířka otvorů. */
  scalePercent: 100,
  scaleOpenings: false,
};
