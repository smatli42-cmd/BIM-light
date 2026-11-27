// Migrace zobrazení (základ 9; hlášení uživatele přes 3D náhled): balíček zobrazení 6 → 7, projekt 19 → 20.
// Světlá žlutá povrchu bouraných prvků (#fff3b0) ve 3D splývala s omítkou; pravidlo bourání dostane sytou
// žlutou jako v Archicadu. Výplň řezu v půdorysu zůstává světlá. Vlastní barva uživatele se nemění.
import { DEMOLISHED_SURFACE } from './presets/rules.ts';

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const OLD = '#fff3b0';

function fix(rule: unknown): unknown {
  if (!isObj(rule) || !isObj(rule['effect']) || rule['effect']['surfaceColor'] !== OLD) return rule;
  return { ...rule, effect: { ...rule['effect'], surfaceColor: DEMOLISHED_SURFACE } };
}

export function displayV6toV7(data: Obj): Obj {
  const rules = isObj(data['rules']) ? data['rules'] : {};
  return { ...data, rules: Object.fromEntries(Object.entries(rules).map(([k, r]) => [k, fix(r)])) };
}

export function projectV19toV20(data: Obj): Obj {
  const display = isObj(data['display']) ? data['display'] : {};
  return { ...data, display: { ...displayV6toV7(display), schemaVersion: 7 } };
}
