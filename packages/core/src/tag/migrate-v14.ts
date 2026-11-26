// Migrace projektu 14 → 15 (plán stěn Z8): projekt dostane prázdný seznam značek typu stěn.
type Obj = Record<string, unknown>;

export function projectV14toV15(data: Obj): Obj {
  return { ...data, wallTags: data['wallTags'] ?? {} };
}
