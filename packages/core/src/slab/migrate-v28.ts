// Migrace projektu 28 → 29: vazba obrysu desky (místnost / stěny) a ostrovy podlahy. Starší desky vazbu
// nemají = ruční obrys (zůstane, jak byl); data se nemění, verze hlídá, že starší program nový soubor
// neotevře a vazbu nezahodí.
type Obj = Record<string, unknown>;

export const projectV28toV29 = (data: Obj): Obj => data;
