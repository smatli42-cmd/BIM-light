// Migrace projektu 29 → 30: volba podlahy v otvoru (`floorSplit`). Starší otvory ji nemají = výchozí
// „rozdělit do dělicí linie“; data se nemění, verze hlídá, že starší program volbu nezahodí.
type Obj = Record<string, unknown>;

export const projectV29toV30 = (data: Obj): Obj => data;
