import { describe, expect, it } from 'vitest';
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
  const rows = () =>
    drawSection(f.model, sec as string)
      .primitives.filter((p) => p.source.dimensionId === id)
      .flatMap((p) => (p.kind === 'text' && p.source.role === 'vrstva skladby' ? [p] : []));
  const all = () => drawSection(f.model, sec as string).primitives.filter((p) => p.source.dimensionId === id);
  return { f, id: id as string, rows, all };
}

const same = (xs: number[]) => Math.max(...xs) - Math.min(...xs) < 0.01;

describe('pokyn uživatele 2026-11-28: zarovnání textu popisky skladby vlevo, na střed, vpravo', () => {
  it('hlášení uživatele (zarovnání nefungovalo – jádro jen odhadovalo šířku písma): řádky mají společnou kotvu', () => {
    const { f, id, rows } = scene();
    for (const align of ['left', 'right', 'center'] as const) {
      f.run('compositionTag.update', { tagId: id, align });
      const r = rows();
      expect(r.every((t) => t.align === align)).toBe(true);
      expect(same(r.map((t) => t.at.x))).toBe(true);
    }
    // Řádky vpravo od čáry: vlevo = hned za čárkou, vpravo = kotva o šířku nejdelšího řádku dál.
    f.run('compositionTag.update', { tagId: id, align: 'left' });
    const x0 = rows()[0]!.at.x;
    f.run('compositionTag.update', { tagId: id, align: 'right' });
    expect(rows()[0]!.at.x).toBeGreaterThan(x0 + 1000);
  });

  it('pokyn uživatele: popiska má vždy stejný tvar – kolečko nahoře, z něj čára dolů, řádky na ní, pod nimi čára', () => {
    const { rows, all } = scene();
    const prims = all();
    const leader = prims.find((p) => p.source.role === 'odkazová čára');
    const circle = prims.find((p) => p.source.role === 'číslo konstrukce');
    if (leader?.kind !== 'line' || circle?.kind !== 'text') throw new Error('chybí čára nebo kolečko');
    const pts = leader.points;
    const [end, top] = [pts[pts.length - 2]!, pts[pts.length - 1]!];
    expect(top.x).toBe(end.x);
    expect(top.y).toBeGreaterThan(end.y);
    expect(circle.at.y).toBeGreaterThan(top.y);
    for (const r of rows()) expect(r.at.y > end.y && r.at.y < top.y).toBe(true);
  });

  it('migrace 40 → 41: dosavadní vzhled – řádky vlevo od čáry zarovnané vpravo, vpravo od čáry vlevo', () => {
    const out = projectV40toV41({ compositionTags: { a: { side: 'left' }, b: { side: 'right' } } });
    expect(out['compositionTags']).toEqual({
      a: { side: 'left', align: 'right' },
      b: { side: 'right', align: 'left' },
    });
  });
});
