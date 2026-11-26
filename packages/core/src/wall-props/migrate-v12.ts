// Migrace projektu 12 → 13 (plán stěn Z7): typy stěn dostanou vlastnosti (funkce, nosná, vnější,
// požární odolnost, akustika). Typ z knihovny převezme výchozí hodnoty knihovní položky, ostatní obecné
// výchozí. Stěny se nemění (bez přepisů = podle typu).
import { libraryWallTypeByKey, WALL_TYPE_LIBRARY_ID } from '../wall-type/library.ts';
import { DEFAULT_WALL_PROPERTIES } from './types.ts';

type Obj = Record<string, unknown>;

function withProperties(t: Obj): Obj {
  if (t['properties']) return t;
  const src = t['source'] as { libraryId?: string; itemId?: string } | undefined;
  const item = src?.libraryId === WALL_TYPE_LIBRARY_ID ? libraryWallTypeByKey(src.itemId ?? '') : undefined;
  return { ...t, properties: { ...DEFAULT_WALL_PROPERTIES, ...item?.properties } };
}

export function projectV12toV13(data: Obj): Obj {
  const types = (data['wallTypes'] ?? {}) as Record<string, Obj>;
  return {
    ...data,
    wallTypes: Object.fromEntries(Object.entries(types).map(([id, t]) => [id, withProperties(t)])),
  };
}
