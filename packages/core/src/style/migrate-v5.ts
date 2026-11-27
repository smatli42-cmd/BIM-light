// Migrace zobrazení (základ 9; požadavek 3D náhledu): balíček zobrazení 5 → 6, projekt 17 → 18.
// Efekt grafiky dostane barvu povrchu ve 3D (`surfaceColor`, null = barva materiálu). Výchozí grafika
// null; pravidlo pro bourané prvky s výplní dostane stejnou barvu povrchu, aby bourání bylo žluté i ve 3D.
type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

const isDemolishedRule = (r: Obj) =>
  Array.isArray(r['conditions']) &&
  r['conditions'].some((c) => isObj(c) && c['property'] === 'status' && c['value'] === 'demolished');

function withSurface(rule: unknown): unknown {
  if (!isObj(rule) || !isObj(rule['effect'])) return rule;
  const e = rule['effect'];
  if ('surfaceColor' in e || typeof e['fillColor'] !== 'string' || !isDemolishedRule(rule)) return rule;
  return { ...rule, effect: { ...e, surfaceColor: e['fillColor'] } };
}

export function displayV5toV6(data: Obj): Obj {
  const base = isObj(data['baseGraphics']) ? data['baseGraphics'] : {};
  const rules = isObj(data['rules']) ? data['rules'] : {};
  return {
    ...data,
    baseGraphics: { surfaceColor: null, ...base },
    rules: Object.fromEntries(Object.entries(rules).map(([k, r]) => [k, withSurface(r)])),
  };
}

export function projectV17toV18(data: Obj): Obj {
  const display = isObj(data['display']) ? data['display'] : {};
  return { ...data, display: { ...displayV5toV6(display), schemaVersion: 6 } };
}
