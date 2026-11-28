import { describe, expect, it } from 'vitest';
import { fixture } from '../testing/fixture.ts';
import type { Section } from './types.ts';

function building() {
  const f = fixture();
  f.line({ x: 0, y: 0 }, { x: 6000, y: 0 });
  f.line({ x: 6000, y: 0 }, { x: 6000, y: 4000 });
  return f;
}

const elevations = (f: ReturnType<typeof fixture>) =>
  Object.values(f.model.sections).filter((s) => s.kind === 'elevation');

describe('STAV-rezy „Pohledy 1–4 z Obsahu“', () => {
  it('STAV-rezy pohledy 1–4: opakované elevation.create pohledy nezdvojí, jen přepočítá čáry podle obálky', () => {
    const f = building();
    const first = f.run('elevation.create', {});
    f.run('section.rename', { sectionId: first[0], name: 'Pohled ke vstupu' });
    f.run('section.update', { sectionId: first[1], scale: 50 });
    f.line({ x: 6000, y: 4000 }, { x: 6000, y: 9000 });
    const again = f.run('elevation.create', {});
    expect(again).toEqual(first);
    expect(elevations(f)).toHaveLength(4);
    const [south, east] = again.map((id) => f.model.sections[id] as Section);
    expect(south?.name).toBe('Pohled ke vstupu');
    expect(east?.scale).toBe(50);
    expect(east?.points[1]?.y).toBeGreaterThanOrEqual(9000);
  });

  it('STAV-rezy pohledy 1–4: smazaný pohled se doplní se stejným číslem, ostatní zůstanou', () => {
    const f = building();
    const ids = f.run('elevation.create', {});
    f.run('section.delete', { sectionId: ids[2] });
    const again = f.run('elevation.create', {});
    expect(
      elevations(f)
        .map((s) => s.mark)
        .sort(),
    ).toEqual(['1', '2', '3', '4']);
    expect(again[0]).toBe(ids[0]);
    expect(again[2]).not.toBe(ids[2]);
  });

  it('STAV-rezy pohledy 1–4: section.create kind elevation = jeden pohled s dalším číslem a názvem fasády', () => {
    const f = building();
    f.run('elevation.create', {});
    const [id] = f.run('section.create', {
      kind: 'elevation',
      start: { x: 0, y: -1000 },
      end: { x: 6000, y: -1000 },
    });
    const s = f.model.sections[id as string] as Section;
    expect(s.kind).toBe('elevation');
    expect(s.mark).toBe('5');
    expect(s.name).toBe('Pohled jižní');
  });

  it('STAV-rezy pohledy 1–4: pohled se zalomenou čarou se odmítne', () => {
    const f = building();
    const r = f.editor.execute('section.create', {
      kind: 'elevation',
      points: [
        { x: 0, y: -1000 },
        { x: 3000, y: -1000 },
        { x: 3000, y: -2000 },
        { x: 6000, y: -2000 },
      ],
    });
    expect(r.ok).toBe(false);
  });
});
