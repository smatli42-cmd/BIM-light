import { describe, expect, it } from 'vitest';
import { vec } from '../geometry/index.ts';
import { fixture } from '../testing/fixture.ts';
import { findElements } from './find.ts';

function scene() {
  const f = fixture();
  const a = f.line(vec(0, 0), vec(5000, 0));
  const b = f.line(vec(0, 3000), vec(5000, 3000), { typeId: f.type('Příčka 100') });
  f.run('wall.curve', { wallId: b, radius: 6000 });
  const [o] = f.run('opening.create', { wallId: a, offset: 1000, width: 900, height: 2000, sill: 0 });
  const [s2] = f.run('storey.create', { name: '2.NP', elevation: 3000, height: 3000 });
  const c = f.line(vec(0, 0), vec(4000, 0), { storeyId: s2 });
  return { f, a, b, c, o: o as string, s2: s2 as string };
}

describe('koncepce-rozhrani / 2 B: Najít a vybrat podle kritérií', () => {
  it('druh a podlaží: stěny 1.NP; otvory; všechna podlaží', () => {
    const { f, a, b, c, o } = scene();
    expect(findElements(f.model, { categories: ['wall'], storeyIds: [f.storeyId] }).walls).toEqual([a, b]);
    expect(findElements(f.model, { categories: ['opening'] }).openings).toEqual([o]);
    expect(findElements(f.model, { categories: ['wall'] }).walls).toEqual([a, b, c]);
  });

  it('typ, tloušťka, oblouková stěna a materiál', () => {
    const { f, a, b, c } = scene();
    expect(findElements(f.model, { wallTypeId: f.type('Příčka 100') }).walls).toEqual([b]);
    expect(findElements(f.model, { thickness: { min: 200 } }).walls).toEqual([a, c]);
    expect(findElements(f.model, { curved: true }).walls).toEqual([b]);
    expect(findElements(f.model, { nameContains: 'příčka' }).walls).toEqual([b]);
    const zdivo = Object.values(f.model.materials).find((m) => m.name === 'Zdivo keramické')?.id;
    expect(findElements(f.model, { materialId: zdivo, categories: ['wall'] }).walls).toContain(a);
  });

  it('šířka otvoru a kritérium, které kóty a otvory vyloučí', () => {
    const { f, o } = scene();
    expect(findElements(f.model, { openingWidth: { min: 800, max: 1000 } }).openings).toEqual([o]);
    expect(findElements(f.model, { openingWidth: { min: 1000 } }).openings).toEqual([]);
    expect(findElements(f.model, { thickness: { min: 1 } }).openings).toEqual([]);
  });
});
