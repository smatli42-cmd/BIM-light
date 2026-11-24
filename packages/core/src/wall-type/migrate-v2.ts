// Migrace projektu 2 → 3 (základ 9, plán stěn Z1): vrstva typu stěny dostane prodloužení
// nahoře a dole (extendTop, extendBottom, výchozí 0).
type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

function layerV3(l: unknown): unknown {
  return isObj(l) ? { extendTop: 0, extendBottom: 0, ...l } : l;
}

function typeV3(t: unknown): unknown {
  if (!isObj(t) || !Array.isArray(t['bands'])) return t;
  const bands = t['bands'].map((b: unknown) =>
    isObj(b) && Array.isArray(b['layers']) ? { ...b, layers: b['layers'].map(layerV3) } : b,
  );
  return { ...t, bands };
}

export function projectV2toV3(data: Obj): Obj {
  const types = isObj(data['wallTypes']) ? data['wallTypes'] : {};
  return {
    ...data,
    wallTypes: Object.fromEntries(Object.entries(types).map(([id, t]) => [id, typeV3(t)])),
  };
}
