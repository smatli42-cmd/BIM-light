import { describe, expect, it } from 'vitest';
import { sequentialIds } from '../ids/index.ts';
import { buildSample, findSample } from '../samples/index.ts';
import { wallQuantities } from '../schedule/quantities.ts';
import { slabLevels } from '../slab/geometry.ts';
import { allSlabs } from '../slab/queries.ts';
import { fixture } from '../testing/fixture.ts';
import { allWalls } from '../wall/queries.ts';
import { wallHeight } from './resolve.ts';

const v = (x: number, y: number) => ({ x, y });

describe('hlášení uživatele / stěna stojí na nosné desce (Revit „Připojit spodek“, Archicad spodek k desce)', () => {
  it('příčka na skladbě podlahy sahá spodkem k hornímu líci nosné desky, ne na čistou podlahu', () => {
    const f = fixture();
    const wall = f.line(v(0, 0), v(4000, 0), { typeId: f.type('Příčka 100') });
    const before = wallQuantities(f.model, f.wall(wall), 0).volume;
    const typeId = Object.values(f.model.slabTypes).find((t) => t.name === 'ŽB strop 250')?.id;
    const [slab] = f.run('slab.create', {
      storeyId: f.storeyId,
      typeId,
      rect: { a: v(-1000, -1000), b: v(5000, 1000) },
      topOffset: -150,
    });
    const top = slabLevels(f.model, f.model.elements[slab as string] as never).top;
    expect(top).toBe(-150);
    const h = wallHeight(f.model, f.wall(wall));
    expect(h.bottom).toBe(-150);
    expect(h.bands[0]?.bottom).toBe(-150);
    // Výkaz počítá zdivo až k desce (řez a 3D berou stejnou výšku).
    expect(wallQuantities(f.model, f.wall(wall), 0).volume).toBeGreaterThan(before);
  });

  it('deska hlouběji než skladba podlahy (sklep, 1 m pod stěnou) spodek stěny nemění', () => {
    const f = fixture();
    const wall = f.line(v(0, 0), v(4000, 0), { typeId: f.type('Příčka 100') });
    const typeId = Object.values(f.model.slabTypes).find((t) => t.name === 'ŽB strop 250')?.id;
    f.run('slab.create', {
      storeyId: f.storeyId,
      typeId,
      rect: { a: v(-1000, -1000), b: v(5000, 1000) },
      topOffset: -1000,
    });
    expect(wallHeight(f.model, f.wall(wall)).bottom).toBe(0);
  });

  it('ukázkový dům: příčky i obvodové stěny 1.NP stojí na nosné desce; stěny 2.NP se nepřekrývají se stěnami 1.NP', () => {
    const m = buildSample(findSample('dum')!, sequentialIds());
    const storeys = Object.values(m.storeys).sort((a, b) => a.elevation - b.elevation);
    const [lower, upper] = storeys;
    const slabTop = (storeyId: string) =>
      Math.max(
        ...allSlabs(m)
          .filter((s) => s.storeyId === storeyId && s.slabFunction === 'structure')
          .map((s) => slabLevels(m, s).top),
      );
    const ground = slabTop(lower!.id);
    for (const w of allWalls(m).filter((w) => w.storeyId === lower!.id))
      expect([m.wallTypes[w.typeId]?.name, wallHeight(m, w).bottom]).toEqual([
        m.wallTypes[w.typeId]?.name,
        ground,
      ]);
    // Příčky 1.NP končí v nosném stropu (nezasahují do skladby podlahy 2.NP); obvodové a nosná zeď nesou
    // stěny 2.NP, proto jdou až pod ně.
    const ceiling = Math.max(
      ...allSlabs(m)
        .filter((s) => s.slabFunction === 'structure')
        .map((s) => slabLevels(m, s).top),
    );
    for (const w of allWalls(m).filter(
      (w) => w.storeyId === lower!.id && m.wallTypes[w.typeId]?.name.includes('říčka'),
    ))
      expect(wallHeight(m, w).top).toBeLessThanOrEqual(ceiling);
    const lowerTop = Math.max(
      ...allWalls(m)
        .filter((w) => w.storeyId === lower!.id)
        .map((w) => wallHeight(m, w).top),
    );
    for (const w of allWalls(m).filter((w) => w.storeyId === upper!.id)) {
      const b = wallHeight(m, w).bottom;
      expect(b).toBeLessThanOrEqual(upper!.elevation);
      // Obvodová stěna 2.NP stojí na obvodové stěně 1.NP (ta jde přes čelo stropu), příčka na stropu.
      if (m.wallTypes[w.typeId]?.name.startsWith('Obvodová')) expect(b).toBe(lowerTop);
    }
  });
});
