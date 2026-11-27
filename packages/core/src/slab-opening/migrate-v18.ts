// Migrace projektu 18 → 19 (desky D3): prázdný seznam otvorů v deskách.
type Obj = Record<string, unknown>;

export const projectV18toV19 = (data: Obj): Obj =>
  data['slabOpenings'] ? data : { ...data, slabOpenings: {} };
