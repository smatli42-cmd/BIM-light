// Migrace projektu 42 → 43: automatické pohledy kolem budovy (pokyn uživatele 2026-11-28). Pohledy
// s označením 1–4 (vznikly příkazem elevation.create) se stanou automatickými, výchozí názvy „Pohled jižní“
// se zkrátí na „Jižní“ (ručně přejmenované zůstanou); chybějící z 1–4 = smazané uživatelem (nevrátí se).
// Projekt bez pohledů je dostane s první změnou modelu.
import { ELEVATION_MARGIN } from './elevations.ts';

type Obj = Record<string, unknown>;

const MARKS = ['1', '2', '3', '4'];
const OLD_NAME = /^Pohled (severní|východní|jižní|západní)$/;

/** „Pohled jižní“ → „Jižní“; jiný název zůstane. */
export function shortElevationName(name: string): string {
  const m = OLD_NAME.exec(name);
  const side = m?.[1];
  return side ? side.charAt(0).toUpperCase() + side.slice(1) : name;
}

function elevation(s: Obj): Obj {
  if (s['kind'] !== 'elevation') return s;
  const auto = MARKS.includes(String(s['mark'])) ? { auto: { locked: false } } : {};
  return { ...s, name: shortElevationName(String(s['name'])), ...auto };
}

export function projectV42toV43(data: Obj): Obj {
  const sections = Object.fromEntries(
    Object.entries((data['sections'] ?? {}) as Record<string, Obj>).map(([id, s]) => [id, elevation(s)]),
  );
  const marks = Object.values(sections)
    .filter((s) => s['kind'] === 'elevation')
    .map((s) => String(s['mark']));
  const has = MARKS.some((m) => marks.includes(m));
  const removed = has ? MARKS.filter((m) => !marks.includes(m)) : [];
  return {
    ...data,
    sections,
    elevationsAround: data['elevationsAround'] ?? { margin: ELEVATION_MARGIN, removed },
  };
}
