import { describe, expect, it } from 'vitest';
import { projectV37toV38 } from './migrate-v37.ts';
import { electroLibraryTypes } from './library.ts';
import type { ElectroType } from './types.ts';

describe('základ 9: migrace 37 → 38 (elektro podle legendy uživatele)', () => {
  it('přidá skupinu Stínění, nahradí neupravené typy knihovny verzí 2, vlastní typy nechá', () => {
    const v2 = electroLibraryTypes();
    const old = (id: string): ElectroType => ({
      ...v2[id]!,
      defaultHeight: 9999,
      source: { libraryId: 'electro-csn-60617', itemId: id.slice(3), version: 1 },
    });
    const own = { ...v2['et-socket']!, id: 'own', name: 'Moje', source: undefined };
    const out = projectV37toV38({
      electroGroups: { 'eg-power': { id: 'eg-power', name: 'Silnoproud', color: '#d32f2f', order: 1 } },
      electroTypes: { 'et-blind': old('et-blind'), 'et-outlet3f': old('et-outlet3f'), own },
      electroElements: { a: 1 },
    });
    const groups = out['electroGroups'] as Record<string, { name: string; color: string }>;
    expect(groups['eg-shading']?.name).toBe('Stínění');
    expect(groups['eg-power']?.color).toBe('#f03d3d');
    const types = out['electroTypes'] as Record<string, ElectroType>;
    expect(types['et-blind']?.groupId).toBe('eg-shading');
    expect(types['et-outlet3f']?.defaultHeight).toBe(300);
    expect(types['own']).toEqual(own);
    expect(out['electroElements']).toEqual({ a: 1 });
  });
});
