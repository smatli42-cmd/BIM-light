import { describe, expect, it } from 'vitest';
import { sequentialIds } from '../ids/index.ts';
import type { Model } from '../model/types.ts';
import { buildSample, findSample } from '../samples/index.ts';
import { drawSection } from './draw.ts';

/** Pohledové hrany stěn ve výkresu pohledu: [u0, z0, u1, z1]. */
function wallEdges(m: Model, name: string): number[][] {
  const s = Object.values(m.sections).find((x) => x.name.includes(name));
  if (!s) throw new Error(`Pohled ${name} chybí`);
  return drawSection(m, s.id).primitives.flatMap((p) => {
    const id = p.source.elementId;
    if (p.kind !== 'line' || p.source.role !== 'pohledová hrana' || m.elements[id ?? '']?.category !== 'wall')
      return [];
    const [a, b] = p.points;
    return a && b ? [[a.x, a.y, b.x, b.y]] : [];
  });
}

const vertical = (e: number[]) => Math.abs((e[0] as number) - (e[2] as number)) < 0.5;
const horizontalAt = (e: number[], z: number) =>
  Math.abs((e[1] as number) - z) < 0.5 && Math.abs((e[3] as number) - z) < 0.5;

describe('hlášení uživatele 2026-11-28 / pohled: skryté hrany za lícem fasády se nekreslí', () => {
  const m = buildSample(findSample('pohledy')!, sequentialIds());

  it.each(['Východní', 'Západní'])(
    'hlášení uživatele / pohled %s: okno v kolmé stěně (viděné z boku) neprořízne její čelo',
    (name) => {
      // Okna jsou jen v jižní stěně (parapet 900, nadpraží 2400); z východu a západu je vidět jen její čelo.
      const edges = wallEdges(m, name);
      expect(edges.filter((e) => horizontalAt(e, 900) || horizontalAt(e, 2400))).toEqual([]);
    },
  );

  it('hlášení uživatele / pohled Východní: tloušťka napojených stěn v líci fasády není vidět', () => {
    // Svislé hrany stěn: jen obrys domu a zalomení L (líc křídla vpředu a křídla vzadu), žádný líc stěny
    // napojené kolmo k fasádě uvnitř plochy fasády.
    const us = new Set(
      wallEdges(m, 'Východní')
        .filter(vertical)
        .map((e) => Math.round(e[0] as number)),
    );
    expect(us.size).toBe(3);
  });

  it('hlášení uživatele / pohled Jižní: okna v líci fasády zůstanou vidět (obrys otvoru)', () => {
    const edges = wallEdges(m, 'Jižní');
    expect(edges.filter((e) => horizontalAt(e, 900)).length).toBe(2);
    expect(edges.filter((e) => horizontalAt(e, 2400)).length).toBe(2);
  });

  it('hlášení uživatele / pohled: střecha ve fasádě zůstane celá a zakryje stěny za sebou', () => {
    for (const name of ['Jižní', 'Východní']) {
      const s = Object.values(m.sections).find((x) => x.name.includes(name))!;
      const roof = drawSection(m, s.id).primitives.filter(
        (p) => p.kind === 'line' && m.elements[p.source.elementId ?? '']?.category === 'roof',
      );
      expect(roof.length).toBeGreaterThan(3);
    }
  });
});
