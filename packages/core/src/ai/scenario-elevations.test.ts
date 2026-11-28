// AI scénář: automatické pohledy 1–4 kolem budovy (pokyn uživatele 2026-11-28) jen JSON voláními nástrojů –
// vzniknou samy, jdou za obálkou, posunutý se zamkne, smazaný se nevrátí, elevation.create je obnoví.
import { describe, expect, it } from 'vitest';
import { room, start } from './scenario-helpers.ts';

interface SectionRow {
  id: string;
  name: string;
  mark: string;
  auto: 'follow' | 'locked' | null;
}
interface Content {
  cut: unknown[];
  seen: unknown[];
}

describe('AI scénář: automatické pohledy', () => {
  it('pohledy kolem budovy: vzniknou samy, jdou za obálkou, posunutý se zamkne, smazaný se nevrátí', () => {
    const c = start();
    room(c);
    const rows = c.ai.call<SectionRow[]>('section.list');
    expect(rows.map((r) => `${r.mark} ${r.name} ${r.auto}`)).toEqual([
      '1 Jižní follow',
      '2 Východní follow',
      '3 Severní follow',
      '4 Západní follow',
    ]);
    const ids = rows.map((r) => r.id);
    const south = c.ai.call<Content>('section.elements', { sectionId: ids[0] });
    expect(south.cut).toEqual([]);
    expect(south.seen.length).toBeGreaterThan(0);
    c.ai.call('section.rename', { sectionId: ids[0], name: 'Vstup' });
    c.ai.call('section.move', { sectionId: ids[1], delta: { x: 1000, y: 0 } });
    c.ai.call('section.delete', { sectionId: ids[3] });
    c.ai.call('wall.chain', {
      storeyId: c.storeyId,
      typeId: c.typeId,
      points: [
        { x: 0, y: 4000 },
        { x: 0, y: 9000 },
      ],
    });
    const after = c.ai.call<SectionRow[]>('section.list');
    expect(after.map((r) => `${r.name} ${r.auto}`)).toEqual([
      'Vstup follow',
      'Východní locked',
      'Severní follow',
    ]);
    expect(c.ai.call<{ removed: string[]; locked: string[] }>('elevation.around')).toMatchObject({
      removed: ['4'],
      locked: ['2'],
    });
    // Obnovit: smazaný se vrátí, posunutý se odemkne; jeden pohled ručně = section.create kind.
    expect(c.ai.call<string[]>('elevation.create', {})).toHaveLength(4);
    expect(c.ai.call<SectionRow[]>('section.list').every((r) => r.auto === 'follow')).toBe(true);
    c.ai.call('section.create', { kind: 'elevation', start: { x: 0, y: -1500 }, end: { x: 4000, y: -1500 } });
    const last = c.ai.call<SectionRow[]>('section.list').at(-1);
    expect([last?.mark, last?.name, last?.auto]).toEqual(['5', 'Jižní', null]);
  });
});
