// Migrace projektu 3 → 4 (základ 9, plán stěn Z2): napojení stěn má nové volitelné pole „nespojovat“
// (`noJoin`). Starý projekt žádné nemá, všechna napojení se spojují jako dosud – data zůstanou beze změny.
type Obj = Record<string, unknown>;

export function projectV3toV4(data: Obj): Obj {
  return { ...data };
}
