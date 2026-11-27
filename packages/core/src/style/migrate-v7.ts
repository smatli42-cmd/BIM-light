// Migrace zobrazení (základ 9; požadavek 3D náhledu): balíček zobrazení 7 → 8. Efekt grafiky dostane
// průhlednost povrchu ve 3D (`surfaceTransparency`, null = podle materiálu); pravidlo pro bourané prvky
// s barvou povrchu 50 % (bourání lehce průhledně, jako v Revitu). Vlastní hodnota uživatele zůstane.
import { DEMOLISHED_TRANSPARENCY } from './presets/rules.ts';

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

const isDemolishedRule = (r: Obj) =>
  Array.isArray(r['conditions']) &&
  r['conditions'].some((c) => isObj(c) && c['property'] === 'status' && c['value'] === 'demolished');

function withTransparency(rule: unknown): unknown {
  if (!isObj(rule) || !isObj(rule['effect'])) return rule;
  const e = rule['effect'];
  if ('surfaceTransparency' in e || typeof e['surfaceColor'] !== 'string' || !isDemolishedRule(rule))
    return rule;
  return { ...rule, effect: { ...e, surfaceTransparency: DEMOLISHED_TRANSPARENCY } };
}

export function displayV7toV8(data: Obj): Obj {
  const base = isObj(data['baseGraphics']) ? data['baseGraphics'] : {};
  const rules = isObj(data['rules']) ? data['rules'] : {};
  return {
    ...data,
    baseGraphics: { surfaceTransparency: null, ...base },
    rules: Object.fromEntries(Object.entries(rules).map(([k, r]) => [k, withTransparency(r)])),
  };
}
