// Výsledné vlastnosti stěny: výchozí → typ → přepis instance (plán stěn Z7).
import type { Model } from '../model/types.ts';
import type { Wall } from '../wall/types.ts';
import type { WallType } from '../wall-type/types.ts';
import {
  DEFAULT_WALL_PROPERTIES,
  type WallProperties,
  type WallPropertyKey,
  type WallPropertyOverrides,
} from './types.ts';

/** Vlastnosti typu (starší data bez vlastností dostanou výchozí). */
export const typeProperties = (t: WallType | undefined): WallProperties => ({
  ...DEFAULT_WALL_PROPERTIES,
  ...t?.properties,
});

/** Výsledné vlastnosti stěny. */
export const wallProperties = (m: Model, w: Wall): WallProperties => ({
  ...typeProperties(m.wallTypes[w.typeId]),
  ...w.properties,
});

/** Klíče, které stěna přepisuje proti typu. */
export const overriddenKeys = (w: Wall): WallPropertyKey[] =>
  Object.keys(w.properties ?? {}) as WallPropertyKey[];

/** Použije změny přepisů: hodnota přepíše, null vrátí „podle typu“. Prázdné přepisy zmizí. */
export function applyOverrides(w: Wall, change: Readonly<Partial<Record<WallPropertyKey, unknown>>>): Wall {
  const merged: Record<string, unknown> = { ...w.properties, ...change };
  const next = Object.fromEntries(Object.entries(merged).filter(([, v]) => v !== null && v !== undefined));
  const { properties: _old, ...rest } = w;
  return Object.keys(next).length ? { ...rest, properties: next as WallPropertyOverrides } : rest;
}
