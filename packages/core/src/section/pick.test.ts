import { describe, expect, it } from 'vitest';
import { sequentialIds } from '../ids/index.ts';
import { buildSample, findSample } from '../samples/index.ts';
import { fixture, type Fixture } from '../testing/fixture.ts';
import { sectionPickAt, sectionPickBox, sectionShapes } from './pick.ts';
import { pointInPolygon } from '../selection/pick.ts';
import type { Section } from './types.ts';

const v = (x: number, y: number) => ({ x, y });

/** Stěna podél x, strop nad ní, okno ve stěně a stěna za rovinou; řez napříč v x = 3000 (pohled k −x). */
function scene(f: Fixture) {
  const wall = f.line(v(0, 0), v(6000, 0));
  const back = f.line(v(0, 0), v(0, 4000));
  const typeId = Object.values(f.model.slabTypes).find((t) => t.name === 'ŽB strop 250')?.id;
  const [slab] = f.run('slab.create', {
    storeyId: f.storeyId,
    typeId,
    rect: { a: v(0, -1000), b: v(6000, 4000) },
    topOffset: 3000,
  });
  const [win] = f.run('opening.create', { wallId: wall, offset: 2500, width: 1000, sill: 900, height: 1200 });
  const [id] = f.run('section.create', { start: v(3000, -2000), end: v(3000, 5000) });
  const s = f.model.sections[id as string] as Section;
  return { wall, back, slab: slab as string, win: win as string, s };
}

describe('pravidla-interakce / Výběr v okně řezu (pokyn uživatele 2026-11-27)', () => {
  it('pravidla-interakce / výběr v řezu: klik na řezanou stěnu, strop a otvor vybere prvek pod kurzorem', () => {
    const f = fixture();
    const { wall, slab, win, s } = scene(f);
    // Stěna je v u = 2000 (y = 0 od startu y = −2000), tloušťka do y < 0 nebo > 0.
    const u = 2000;
    expect(sectionPickAt(f.model, s, v(u + 1, 500), 50)[0]).toBe(wall);
    expect(sectionPickAt(f.model, s, v(u + 1, 1500), 50)[0]).toBe(win);
    expect(sectionPickAt(f.model, s, v(4000, 2900), 20)[0]).toBe(slab);
  });

  it('pravidla-interakce / výběr v řezu: stěna za rovinou (pohledová plocha) jde vybrat, řezaná má přednost', () => {
    const f = fixture();
    const { back, slab, s } = scene(f);
    const hits = sectionPickAt(f.model, s, v(4500, 1500), 20);
    expect(hits).toContain(back);
    expect(hits).not.toContain(slab);
  });

  it('pravidla-interakce / rámeček: zleva doprava jen celé prvky, zprava doleva i protnuté', () => {
    const f = fixture();
    const { wall, slab, s } = scene(f);
    const window = sectionPickBox(f.model, s, v(1500, -100), v(2600, 3100), false);
    expect(window).toContain(wall);
    expect(window).not.toContain(slab);
    const crossing = sectionPickBox(f.model, s, v(1500, -100), v(2600, 3100), true);
    expect(crossing).toContain(slab);
  });
  it('hlášení uživatele / výběr v řezu: klik kamkoli do řezané stěny ukázkového domu ji vybere (horní, střední, dolní třetina)', () => {
    // Chyba: okno za rovinou řezu bralo hloubku řezané stěny a překrylo její plochu (klik vybral okno).
    for (const key of ['dum']) {
      const m = buildSample(findSample(key)!, sequentialIds());
      for (const s of Object.values(m.sections)) {
        const walls = sectionShapes(m, s).filter((x) => x.category === 'wall' && x.depth < 0);
        for (const w of walls)
          for (const sh of w.shapes) {
            const xs = sh.outer.map((q) => q.x);
            const ys = sh.outer.map((q) => q.y);
            const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
            for (const fy of [0.15, 0.5, 0.85])
              for (const fx of [0.25, 0.5, 0.75]) {
                const q = v(x0 + (x1 - x0) * fx, y0 + (y1 - y0) * fy);
                if (!pointInPolygon(q, sh.outer) || sh.holes.some((h) => pointInPolygon(q, h))) continue;
                expect([key, s.name, sectionPickAt(m, s, q, 20)[0]]).toEqual([key, s.name, w.id]);
              }
          }
      }
    }
  });

  it('hlášení uživatele / výběr v řezu: okno za rovinou řezu nepřekryje řezanou stěnu, sám jde vybrat ve své hloubce', () => {
    const f = fixture();
    const { wall, win, s } = scene(f);
    // Řez posunutý mimo okno (okno 2500–3500 podél stěny, řez v x = 4000, pohled k −x): okno je za rovinou.
    f.run('section.update', { sectionId: s.id, start: v(4000, -2000), end: v(4000, 5000) });
    const s2 = f.model.sections[s.id] as Section;
    const [sh] = sectionShapes(f.model, s2).filter((x) => x.id === win);
    expect(sh?.depth).toBeGreaterThan(0);
    expect(sectionPickAt(f.model, s2, v(2001, 1500), 20)[0]).toBe(wall);
    const o = sh?.shapes[0]?.outer ?? [];
    const mid = v((Math.min(...o.map((q) => q.x)) + Math.max(...o.map((q) => q.x))) / 2, 1500);
    expect(sectionPickAt(f.model, s2, mid, 0)).toContain(win);
  });
});
