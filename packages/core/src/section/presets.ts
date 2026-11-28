// Výchozí styly řezu nového projektu se stálými id (knihovní položky, základ 21; id se neposouvají).
import type { Id } from '../ids/index.ts';
import { ELEVATION_MARGIN } from './elevations.ts';
import { SECTION_PRESET_LIBRARY, type SectionPreset } from './types.ts';

const KEYS = ['sp-full', 'sp-6m'] as const;

export function defaultSectionPresets(): Record<Id, SectionPreset> {
  return Object.fromEntries(
    SECTION_PRESET_LIBRARY.map((p, i) => {
      const id = KEYS[i] ?? `sp-${i}`;
      return [id, { id, ...p }];
    }),
  );
}

/** Řezy a výškové kóty nového projektu: žádné řezy ani kóty, výchozí styly řezu. */
export const emptySectionData = () => ({
  sections: {},
  sectionPresets: defaultSectionPresets(),
  elevationsAround: { margin: ELEVATION_MARGIN, removed: [] },
  levelDims: {},
  planLevelDims: {},
  sectionDims: {},
  compositionTags: {},
});
