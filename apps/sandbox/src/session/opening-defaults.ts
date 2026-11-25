// Rozměry nového otvoru v nástroji Otvor (plán stěn Z4); mění je panel vpravo.
export interface OpeningDefaults {
  width: number;
  height: number;
  sill: number;
  kind: 'through' | 'niche';
  depth: number;
  side: 'ref' | 'opp';
}
