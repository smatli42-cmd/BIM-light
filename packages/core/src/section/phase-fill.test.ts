// Hlášení uživatele 2026-11-27: v řezu nebylo bourání vidět – zbouraná stěna rovnoběžná s rovinou řezu
// leží za ní a její obrys splývá s obrysem místnosti, takže nepřibude žádná čára. Pohledová plocha prvku
// s barvou povrchu z funkce grafiky (fáze: bourání žlutě, nové červeně) se v řezu vyplní touto barvou
// (stejně jako ve 3D, Archicad „renovace“ / Revit barva fáze), zakrytá bližšími prvky.
import { describe, expect, it } from 'vitest';
import { sequentialIds } from '../ids/index.ts';
import { buildSample, findSample } from '../samples/index.ts';
import { drawSection } from './draw.ts';

const phase = (m: ReturnType<typeof buildSample>, name: string) =>
  Object.values(m.display.overrideCombinations).find((c) => c.name === name)?.id ?? null;

describe('hlášení uživatele / fáze v řezu: pohledová plocha v barvě fáze', () => {
  it('Řez B ve fázi Bourací práce: zbouraná příčka za rovinou má žlutou plochu; Vše bez barevných ploch', () => {
    let m = buildSample(findSample('dum')!, sequentialIds());
    const sec = Object.values(m.sections).find((s) => s.name === 'Řez B')!;
    const demolished = Object.values(m.elements).find(
      (e) => e.category === 'wall' && e.status === 'demolished',
    )!;
    const fills = () =>
      drawSection(m, sec.id).primitives.filter(
        (p) => p.kind === 'fill' && p.source.role === 'pohledová plocha',
      );
    expect(fills()).toEqual([]);
    m = {
      ...m,
      sections: { ...m.sections, [sec.id]: { ...sec, phaseFilterId: phase(m, 'Fáze – bourací práce') } },
    };
    const own = fills().filter((p) => p.source.elementId === demolished.id);
    expect(own.length).toBeGreaterThan(0);
    expect(own.every((p) => p.kind === 'fill' && p.color === '#f2c200')).toBe(true);
  });
});
