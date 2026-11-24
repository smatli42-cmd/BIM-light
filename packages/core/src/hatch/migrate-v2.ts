// Migrace šraf a stylů (základ 9): balíček zobrazení 2 → 3, projekt 5 → 6.
// Styl dostane měřítko šraf 1 (beze změny vzhledu), šrafa příznak „odvozená“ podle odkazu na variantu.
// Nový druh rodiny „motiv“ stará data nemají, takže zůstanou platná.
type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

const mapValues = (rec: unknown, fn: (v: Obj) => Obj): Obj =>
  Object.fromEntries(Object.entries(isObj(rec) ? rec : {}).map(([k, v]) => [k, isObj(v) ? fn(v) : v]));

export function displayV2toV3(data: Obj): Obj {
  return {
    ...data,
    styles: mapValues(data['styles'], (s) => ({ hatchScale: 1, ...s })),
    hatches: mapValues(data['hatches'], (h) => ({ derived: typeof h['variantOf'] === 'string', ...h })),
  };
}

export function projectV5toV6(data: Obj): Obj {
  const display = isObj(data['display']) ? data['display'] : {};
  return { ...data, display: { ...displayV2toV3(display), schemaVersion: 3 } };
}
