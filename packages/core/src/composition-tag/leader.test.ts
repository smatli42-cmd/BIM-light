import { describe, expect, it } from 'vitest';
import { tagLayout } from './content.ts';
import { moveLeaderEnd, nextLeaderPoint, normalizeLeader } from './leader.ts';
import { fixture } from '../testing/fixture.ts';

const v = (x: number, y: number) => ({ x, y });

describe('pokyn uživatele 2026-11-28: odkazová čára popisu skladby vždy kolmo ke konstrukci', () => {
  it('první bod se srovná na kolmici: deska svisle (y), stěna vodorovně (x); nulové úseky pryč', () => {
    expect(normalizeLeader('y', [v(300, 900), v(0, 900), v(1200, 900)])).toEqual([v(0, 900), v(1200, 900)]);
    expect(normalizeLeader('x', [v(-800, 400)])).toEqual([v(-800, 0)]);
    expect(normalizeLeader('y', [v(500, 0)])).toBeNull();
  });

  it('tažení konce: z rovné čáry vznikne lomená „L“, u lomené se srovná předchozí bod (pravé úhly)', () => {
    expect(moveLeaderEnd('y', [v(0, 1000)], v(800, 200))).toEqual([v(0, 1200), v(800, 1200)]);
    expect(moveLeaderEnd('y', [v(0, 1000), v(800, 1000)], v(100, 300))).toEqual([v(0, 1300), v(900, 1300)]);
  });

  it('kreslení: další bod srovnaný vodorovně / svisle podle bližšího směru, Shift = volně', () => {
    expect(nextLeaderPoint('y', [], v(300, 900))).toEqual(v(0, 900));
    expect(nextLeaderPoint('y', [v(0, 900)], v(1000, 950))).toEqual(v(1000, 900));
    expect(nextLeaderPoint('y', [v(0, 900)], v(1000, 950), true)).toEqual(v(1000, 950));
  });

  it('kresba: čára protne celou desku od protilehlého líce kolmo, končí v kolečku s číslem', () => {
    const f = fixture();
    f.line(v(0, 0), v(6000, 0));
    const type = Object.values(f.model.slabTypes).find((t) => t.name === 'ŽB strop 250')?.id;
    const rect = { a: v(0, -2000), b: v(6000, 2000) };
    const [slab] = f.run('slab.create', { storeyId: f.storeyId, typeId: type, rect, topOffset: 3000 });
    const [sec] = f.run('section.create', { start: v(3000, -3000), end: v(3000, 3000) });
    const s = f.model.sections[sec as string]!;
    const row = f.editor.query('section.elements', { sectionId: sec });
    const cut = (row.ok ? (row.data as { cut: { elementId: string; u0: number; u1: number }[] }) : null)!.cut;
    const r = cut.find((c) => c.elementId === slab)!;
    const x = r.u0 + 500;
    const [id] = f.run('compositionTag.create', {
      sectionId: sec,
      elementId: slab,
      at: v(x, 2870),
      points: [v(x + 200, 4000), v(x + 1000, 4000)],
    });
    const l = tagLayout(f.model, s, f.model.compositionTags[id as string]!)!;
    // Čára začne na spodním líci desky, jde svisle nahoru přes celou tloušťku, pak vodorovně ke kolečku.
    expect(l.path[0]?.y).toBeLessThan(2760);
    expect(l.path.map((p) => Math.round(p.x))).toEqual([Math.round(x), Math.round(x), Math.round(x + 1000)]);
    expect(l.path[1]?.y).toBe(4000);
    expect(l.mark).toBe('D1');
  });
});
