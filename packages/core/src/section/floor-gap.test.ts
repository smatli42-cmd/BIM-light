// Hlášení uživatele 2026-11-27 (screenshot řezu): pod stěnou zůstal ve skladbě podlahy bílý prázdný
// obdélník a nad příčkou 1.NP kus stěny v podlaze 2.NP. Správně: stěna sahá na horní líc nosné desky,
// podlaha se k ní přisadí – ve skladbě podlahy v řezu není díra ani překryv stěny s podlahou.
import { describe, expect, it } from 'vitest';
import { sequentialIds } from '../ids/index.ts';
import { buildSample, findSample } from '../samples/index.ts';
import { slabLevels } from '../slab/geometry.ts';
import { allSlabs } from '../slab/queries.ts';
import { sectionContent } from './content.ts';

interface Piece {
  u0: number;
  u1: number;
  bottom: number;
  top: number;
}
interface Row extends Piece {
  elementId: string;
  pieces?: readonly Piece[];
}

/** Svislé intervaly kusů v místě u (sjednocené přes kusy jednoho druhu). */
const at = (rows: readonly Row[], u: number) =>
  rows.flatMap((r) => (r.pieces?.length ? r.pieces : [r])).filter((p) => p.u0 < u && p.u1 > u);

const covered = (ps: readonly Piece[], z0: number, z1: number) => {
  let z = z0;
  for (const p of [...ps].sort((a, b) => a.bottom - b.bottom)) if (p.bottom <= z + 1 && p.top > z) z = p.top;
  return z >= z1 - 1;
};

const overlap = (a: readonly Piece[], b: readonly Piece[], z0: number, z1: number) =>
  a.some((p) => b.some((q) => Math.min(p.top, q.top, z1) - Math.max(p.bottom, q.bottom, z0) > 1));

describe('hlášení uživatele / skladba podlahy v řezu bez děr a překryvů', () => {
  it('ukázkový dům: pod i nad každou stěnou je skladba podlahy vyplněná (stěna k nosné desce, podlaha přisazená)', () => {
    const m = buildSample(findSample('dum')!, sequentialIds());
    const structure = allSlabs(m).filter((s) => s.slabFunction === 'structure');
    for (const s of Object.values(m.sections).filter((x) => x.kind === 'section')) {
      const cut = sectionContent(m, s).cut as Row[];
      const kind = (id: string) => m.elements[id]?.category;
      const storeyOf = (id: string) => m.elements[id]!.storeyId;
      const walls = cut.filter((r) => kind(r.elementId) === 'wall');
      const floors = cut.filter(
        (r) =>
          kind(r.elementId) === 'slab' &&
          (m.elements[r.elementId] as never as { slabFunction: string }).slabFunction !== 'structure',
      );
      for (const st of Object.values(m.storeys)) {
        const slab = structure.find((x) => x.storeyId === st.id || slabLevels(m, x).top <= st.elevation);
        const zone = structure
          .map((x) => slabLevels(m, x).top)
          .filter((t) => t < st.elevation - 1 && t >= st.elevation - 300);
        if (!slab || !zone.length) continue;
        const z0 = Math.max(...zone);
        const z1 = st.elevation;
        const slabRows = cut.filter(
          (r) => kind(r.elementId) === 'slab' && slabLevels(m, m.elements[r.elementId] as never).top === z0,
        );
        for (const w of walls) {
          const u = (w.u0 + w.u1) / 2;
          if (!slabRows.some((r) => r.u0 < u && r.u1 > u)) continue;
          const ws = at(walls, u);
          const fs = at(floors, u);
          const id = [
            s.name,
            st.name,
            m.wallTypes[(m.elements[w.elementId] as never as { typeId: string }).typeId]?.name,
            u,
          ];
          expect([...id, covered([...ws, ...fs], z0, z1)]).toEqual([...id, true]);
          expect([...id, overlap(ws, fs, z0, z1)]).toEqual([...id, false]);
          // Stěna nižšího podlaží do skladby podlahy nad stropem jen tam, kde na ní stojí stěna z patra.
          const lowerIn = walls.some(
            (r) =>
              r.u0 < u &&
              r.u1 > u &&
              r.top > z0 + 1 &&
              m.storeys[storeyOf(r.elementId)]!.elevation < st.elevation,
          );
          const upperOn = walls.some(
            (r) => r.u0 < u && r.u1 > u && r.bottom <= z1 + 1 && storeyOf(r.elementId) === st.id,
          );
          expect([...id, lowerIn && !upperOn]).toEqual([...id, false]);
        }
      }
    }
  });
});
