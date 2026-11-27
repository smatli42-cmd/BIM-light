// Migrace projektu 33 → 34: výškové kóty v půdorysu (prázdný seznam).
type Obj = Record<string, unknown>;

export const projectV33toV34 = (data: Obj): Obj => ({ ...data, planLevelDims: data['planLevelDims'] ?? {} });
