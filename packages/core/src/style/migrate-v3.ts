// Migrace zobrazení (základ 9, plán stěn Z6): balíček zobrazení 3 → 4, projekt 10 → 11.
// Výchozí grafika dostane konce stěn (čelní čára volného konce, zapnuto) a značku referenční čáry
// (vypnuto) – vzhled starých projektů se nezmění.
type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

export function displayV3toV4(data: Obj): Obj {
  const base = isObj(data['baseGraphics']) ? data['baseGraphics'] : {};
  return { ...data, baseGraphics: { endLines: true, refLine: false, ...base } };
}

export function projectV10toV11(data: Obj): Obj {
  const display = isObj(data['display']) ? data['display'] : {};
  return { ...data, display: { ...displayV3toV4(display), schemaVersion: 4 } };
}
