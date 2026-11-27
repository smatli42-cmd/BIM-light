// Migrace projektu 35 → 36: délkové kóty v řezech (prázdný seznam).
type Obj = Record<string, unknown>;

export const projectV35toV36 = (data: Obj): Obj => ({ ...data, sectionDims: data['sectionDims'] ?? {} });
