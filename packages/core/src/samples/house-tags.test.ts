import { describe, expect, it } from 'vitest';
import { tagLayout } from '../composition-tag/content.ts';
import { sequentialIds } from '../ids/index.ts';
import { buildSample, findSample } from './index.ts';

describe('pokyn uživatele 2026-11-26 (ukázky): popis skladby v Řezu A domu', () => {
  it('scéna popis-skladeb: obvodová stěna, strop a podlaha mají popis s vrstvami z typu', () => {
    const sample = findSample('popis-skladeb');
    expect(sample).toBeDefined();
    const m = buildSample(sample!, sequentialIds());
    const tags = Object.values(m.compositionTags);
    expect(tags).toHaveLength(3);
    const cats = tags.map((t) => m.elements[t.elementId]?.category).sort();
    expect(cats).toEqual(['slab', 'slab', 'wall']);
    for (const t of tags) {
      const l = tagLayout(m, m.sections[t.sectionId]!, t);
      expect(l?.lines.length).toBeGreaterThan(1);
    }
  });
});
