import { describe, expect, it } from 'vitest';
import { fixture, type Fixture } from '../testing/fixture.ts';
import { sectionPickAt, sectionPickBox } from './pick.ts';
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
});
