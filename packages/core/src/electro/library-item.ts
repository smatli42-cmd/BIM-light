// Položka vestavěné knihovny elektro typů (základ 21): v projektu je kopie s odkazem na původ.
import type { ElectroFamily, ElectroMount, ElectroType } from './types.ts';

export const ELECTRO_LIBRARY_ID = 'electro-csn-60617';
/** Verze knihovny: 2 = tvary, výšky a popisy podle legendy uživatele (2026-11-27). */
export const ELECTRO_LIBRARY_VERSION = 2;

/** Položka knihovny = typ bez id (id v projektu je „et-“ + klíč, stálé). */
export type ElectroLibraryItem = Omit<ElectroType, 'id' | 'source'> & { readonly key: string };

/** Přístroj ze slotů (zásuvka, spínač…): zkratka pro data knihovny. */
export function glyphItem(
  key: string,
  name: string,
  description: string,
  o: {
    family: ElectroFamily;
    groupId: string;
    ifcClass: string;
    predefinedType: string;
    mount?: ElectroMount;
    height: number | null;
    glyphs: readonly string[];
  },
): ElectroLibraryItem {
  return {
    key,
    name,
    description,
    family: o.family,
    groupId: o.groupId,
    ifcClass: o.ifcClass,
    predefinedType: o.predefinedType,
    mount: o.mount ?? (o.height === null ? 'ceiling' : 'wall'),
    defaultHeight: o.height,
    symbol: { kind: 'glyphs', glyphs: o.glyphs },
  };
}

export const electroTypeId = (key: string): string => `et-${key}`;

export function typeFromLibrary(item: ElectroLibraryItem): ElectroType {
  const { key, ...rest } = item;
  return {
    ...rest,
    id: electroTypeId(key),
    source: { libraryId: ELECTRO_LIBRARY_ID, itemId: key, version: ELECTRO_LIBRARY_VERSION },
  };
}
