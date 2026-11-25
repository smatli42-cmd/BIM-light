// Migrace projektu 7 → 8 (základ 9, plán stěn Z5): délková kóta má nové volitelné pole `measure`
// (oblouk / tětiva / poloměr) a vzdálenostní kóta `arc` (kóta po oblouku). Starý projekt žádné nemá,
// kóty měří jako dosud – data zůstanou beze změny.
type Obj = Record<string, unknown>;

export function projectV7toV8(data: Obj): Obj {
  return { ...data };
}
