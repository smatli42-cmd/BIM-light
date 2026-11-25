// Migrace projektu 8 → 9 (základ 9, rozhraní UI2): referenční čára stěny má novou hodnotu „opp-face“
// (protilehlý líc, „vně“). Starý projekt ji nemá; stěny zůstanou beze změny.
type Obj = Record<string, unknown>;

export function projectV8toV9(data: Obj): Obj {
  return { ...data };
}
