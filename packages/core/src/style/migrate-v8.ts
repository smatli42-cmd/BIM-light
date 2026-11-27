// Migrace zobrazení 8 → 9 (hlášení uživatele: popisky místnosti moc velké): velikosti na papíře dostanou
// výšku čísla a ostatních řádků razítka místnosti a řádkování (ČSN 01 3420). Vlastní hodnoty zůstanou.
import { ROOM_PAPER_SIZES } from './presets/defaults.ts';

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

export function displayV8toV9(data: Obj): Obj {
  const paper = isObj(data['paperSizes']) ? data['paperSizes'] : {};
  return { ...data, paperSizes: { ...ROOM_PAPER_SIZES, ...paper } };
}

/** Projekt 24 → 25: totéž v nastavení zobrazení projektu. */
export function projectV24toV25(data: Obj): Obj {
  const display = isObj(data['display']) ? data['display'] : {};
  return { ...data, display: { ...displayV8toV9(display), schemaVersion: 9 } };
}
