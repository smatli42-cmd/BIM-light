// Migrace projektu 38 → 39: popisy skladby v řezech (prázdný seznam).
type Obj = Record<string, unknown>;

export const projectV38toV39 = (data: Obj): Obj => ({
  ...data,
  compositionTags: data['compositionTags'] ?? {},
});
