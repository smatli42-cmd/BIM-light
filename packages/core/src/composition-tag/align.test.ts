import { describe, expect, it } from 'vitest';
import { textWidth } from '../level-dim/terrain.ts';
import { drawSection } from '../section/draw.ts';
import { fixture } from '../testing/fixture.ts';
import { projectV40toV41 } from './migrate-v39.ts';

const v = (x: number, y: number) => ({ x, y });

/** Popis obvodové stěny v řezu; vrátí funkci, která dá řádky (střed, šířka) a čárky popisu. */
function scene() {
  const f = fixture();
  const wall = f.line(v(0, 0), v(6000, 0), { typeId: f.type('Obvodová zateplená 465') });
  const [sec] = f.run('section.create', { start: v(3000, -3000), end: v(3000, 3000) });
  const q = f.editor.query('section.elements', { sectionId: sec });
  const cut = (q.ok ? (q.data as { cut: { elementId: string; u0: number }[] }) : null)!.cut;
  const u = cut.find((c) => c.elementId === wall)!.u0 + 100;
  const [id] = f.run('compositionTag.create', {
    sectionId: sec,
    elementId: wall,
    at: v(u, 1000),
    points: [v(u + 2000, 1000), v(u + 2000, 2500)],
  });
  const th = f.model.display.paperSizes.labelText * f.model.sections[sec as string]!.scale;
  const rows = () => {
    const prims = drawSection(f.model, sec as string).primitives.filter((p) => p.source.dimensionId === id);
    const texts = prims.flatMap((p) => (p.kind === 'text' && p.source.role === 'vrstva skladby' ? [p] : []));
    return texts.map((t) => ({
      l: t.at.x - textWidth(t.text, th) / 2,
      r: t.at.x + textWidth(t.text, th) / 2,
      c: t.at.x,
    }));
  };
  return { f, id: id as string, rows };
}

const same = (xs: number[]) => Math.max(...xs) - Math.min(...xs) < 0.01;

describe('pokyn uživatele 2026-11-28: zarovnání textu popisky skladby vlevo, na střed, vpravo', () => {
  it('vlevo = společný levý okraj, vpravo = pravý, na střed = společný střed řádků', () => {
    const { f, id, rows } = scene();
    expect(same(rows().map((r) => r.l))).toBe(true);
    f.run('compositionTag.update', { tagId: id, align: 'right' });
    expect(same(rows().map((r) => r.r))).toBe(true);
    expect(same(rows().map((r) => r.l))).toBe(false);
    f.run('compositionTag.update', { tagId: id, align: 'center' });
    expect(same(rows().map((r) => r.c))).toBe(true);
  });

  it('migrace 40 → 41: dosavadní vzhled – řádky vlevo od čáry zarovnané vpravo, vpravo od čáry vlevo', () => {
    const out = projectV40toV41({ compositionTags: { a: { side: 'left' }, b: { side: 'right' } } });
    expect(out['compositionTags']).toEqual({
      a: { side: 'left', align: 'right' },
      b: { side: 'right', align: 'left' },
    });
  });
});
