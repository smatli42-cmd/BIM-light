// Rozměry nového otvoru v nástroji Otvor (plán stěn Z4); mění je panel vpravo.
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
