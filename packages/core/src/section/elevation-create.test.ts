import { describe, expect, it } from 'vitest';
import { PROJECT_MIGRATIONS } from '../persistence/project-file.ts';
import { fixture } from '../testing/fixture.ts';
import { projectV42toV43 } from './migrate-v42.ts';
import type { Section } from './types.ts';

function building() {
  const f = fixture();
  f.line({ x: 0, y: 0 }, { x: 6000, y: 0 });
  f.line({ x: 6000, y: 0 }, { x: 6000, y: 4000 });
  return f;
}

type F = ReturnType<typeof fixture>;
const elevations = (f: F) => Object.values(f.model.sections).filter((s) => s.kind === 'elevation');
const byMark = (f: F, mark: string) => elevations(f).find((s) => s.mark === mark) as Section;

describe('STAV-rezy „Automatické pohledy 1–4“ (pokyn uživatele 2026-11-28)', () => {
  it('STAV-rezy auto pohledy: prázdný projekt je nemá, první stěna je vytvoří (Jižní, Východní, Severní, Západní)', () => {
    const f = fixture();
    expect(elevations(f)).toEqual([]);
    f.line({ x: 0, y: 0 }, { x: 6000, y: 0 });
    expect(elevations(f).map((s) => `${s.mark} ${s.name}`)).toEqual([
      '1 Jižní',
      '2 Východní',
      '3 Severní',
      '4 Západní',
    ]);
    expect(elevations(f).every((s) => s.auto?.locked === false)).toBe(true);
    f.editor.undo();
    expect(elevations(f)).toEqual([]);
  });

  it('STAV-rezy auto pohledy: čáry jdou za obálkou budovy, přejmenovaný si název nechá', () => {
    const f = building();
    f.run('section.rename', { sectionId: byMark(f, '2').id, name: 'Od zahrady' });
    f.line({ x: 6000, y: 4000 }, { x: 6000, y: 9000 });
    expect(elevations(f)).toHaveLength(4);
    expect(byMark(f, '2').name).toBe('Od zahrady');
    expect(byMark(f, '2').points[1]?.y).toBeGreaterThanOrEqual(12000);
    expect(byMark(f, '3').points[0]?.y).toBeGreaterThanOrEqual(12000);
  });

  it('STAV-rezy auto pohledy / základ 16: ručně posunutý pohled se zamkne a přepočet ho nechá být', () => {
    const f = building();
    const id = byMark(f, '1').id;
    f.run('section.move', { sectionId: id, delta: { x: 0, y: -2000 } });
    const moved = byMark(f, '1').points;
    expect(byMark(f, '1').auto?.locked).toBe(true);
    f.line({ x: 0, y: 0 }, { x: 0, y: -5000 });
    expect(byMark(f, '1').points).toEqual(moved);
    f.run('elevation.create', {});
    expect(byMark(f, '1').auto?.locked).toBe(false);
    expect(byMark(f, '1').points[0]?.y).toBeLessThan(-5000);
  });

  it('STAV-rezy auto pohledy: smazaný se znovu nevytvoří, elevation.create ho obnoví se stejným číslem', () => {
    const f = building();
    f.run('section.delete', { sectionId: byMark(f, '3').id });
    f.line({ x: 0, y: 0 }, { x: 0, y: 4000 });
    expect(elevations(f).map((s) => s.mark)).toEqual(['1', '2', '4']);
    expect(f.model.elevationsAround.removed).toEqual(['3']);
    const ids = f.run('elevation.create', {});
    expect(ids).toHaveLength(4);
    expect(byMark(f, '3').name).toBe('Severní');
    expect(f.model.elevationsAround.removed).toEqual([]);
  });

  it('STAV-rezy auto pohledy: section.create kind elevation = ruční pohled s dalším číslem', () => {
    const f = building();
    const [id] = f.run('section.create', {
      kind: 'elevation',
      start: { x: 0, y: -1000 },
      end: { x: 6000, y: -1000 },
    });
    const s = f.model.sections[id as string] as Section;
    expect([s.kind, s.mark, s.name, s.auto]).toEqual(['elevation', '5', 'Jižní', undefined]);
  });

  it('STAV-rezy auto pohledy: pohled se zalomenou čarou se odmítne', () => {
    const f = building();
    const points = [
      { x: 0, y: -1000 },
      { x: 3000, y: -1000 },
      { x: 3000, y: -2000 },
      { x: 6000, y: -2000 },
    ];
    expect(f.editor.execute('section.create', { kind: 'elevation', points }).ok).toBe(false);
  });

  it('základ 9: migrace 42 → 43 zkrátí výchozí názvy, přejmenované nechá, chybějící z 1–4 = smazané', () => {
    const el = (mark: string, name: string) => ({ kind: 'elevation', mark, name });
    const out = projectV42toV43({
      sections: {
        a: el('1', 'Pohled jižní'),
        b: el('2', 'Vstup'),
        c: el('4', 'Pohled západní'),
        r: { kind: 'section', mark: 'A', name: 'Řez A' },
      },
    });
    const s = out['sections'] as Record<string, Record<string, unknown>>;
    expect([s['a']?.['name'], s['b']?.['name'], s['c']?.['name']]).toEqual(['Jižní', 'Vstup', 'Západní']);
    expect(s['a']?.['auto']).toEqual({ locked: false });
    expect(s['r']).toEqual({ kind: 'section', mark: 'A', name: 'Řez A' });
    expect(out['elevationsAround']).toEqual({ margin: 3000, removed: ['3'] });
    expect(projectV42toV43({ sections: {} })['elevationsAround']).toEqual({ margin: 3000, removed: [] });
    expect(PROJECT_MIGRATIONS[42]).toBe(projectV42toV43);
  });
});
