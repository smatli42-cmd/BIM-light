import { describe, expect, it } from 'vitest';
import { vec } from '../geometry/index.ts';
import { fixture, room, type Fixture } from '../testing/fixture.ts';
import { elementOutlineTempDimensions, outlineTempDimensions } from './outline-temp.ts';
import type { OutlineRef } from './types.ts';

const slabType = (f: Fixture) => Object.values(f.model.slabTypes).find((t) => t.name === 'ŽB strop 250')!.id;

/** Místnost 4 × 3 m (vnitřní líce x 0 / 4000, y 0 / 3000), deska po vnitřní líc, otvor 1000 × 500. */
function scene() {
  const f = fixture();
  const walls = room(f);
  const [slab] = f.run('slab.create', {
    storeyId: f.storeyId,
    typeId: slabType(f),
    rect: { a: vec(0, 0), b: vec(4000, 3000) },
  });
  const [hole] = f.run('slabOpening.create', {
    storeyId: f.storeyId,
    rect: { a: vec(1000, 1000), b: vec(2000, 1500) },
  });
  return { f, walls, slab: slab!, hole: hole! };
}
/** Deska 4 × 3 m bez stěn kolem, otvor v ní a stěna 1 m nad deskou (líc y = 4000). */
function freeSlab() {
  const f = fixture();
  const [slab] = f.run('slab.create', {
    storeyId: f.storeyId,
    typeId: slabType(f),
    rect: { a: vec(0, 0), b: vec(4000, 3000) },
  });
  const [hole] = f.run('slabOpening.create', {
    storeyId: f.storeyId,
    rect: { a: vec(1000, 1000), b: vec(2000, 1500) },
  });
  f.line(vec(0, 4000), vec(4000, 4000));
  return { f, slab: slab!, hole: hole! };
}
const bySide = (list: ReturnType<typeof outlineTempDimensions>) =>
  Object.fromEntries(list.map((t) => [t.side, t]));

describe('katalog-kresleni / část 3: dočasné kóty desky a otvoru v desce', () => {
  it('katalog kreslení 3.1: otvor v desce má kóty X a Y na obě strany k nejbližším lícům stěn', () => {
    const { f, walls, hole } = scene();
    const d = bySide(elementOutlineTempDimensions(f.model, hole));
    expect([d['x-']?.value, d['x+']?.value, d['y-']?.value, d['y+']?.value]).toEqual([
      1000, 2000, 1000, 1500,
    ]);
    // Hrana desky leží na líci stěny: přednost má líc stěny [R].
    expect(d['x-']?.other).toMatchObject({ wallId: walls[0] });
    expect(d['x-']?.parallel).toBe(true);
    expect(d['x-']?.own).toMatchObject({ outline: 'slabOpening', ownerId: hole });
  });

  it('katalog kreslení 3.1: mezi dvěma otvory se měří k hraně sousedního otvoru', () => {
    const { f, hole } = scene();
    const [other] = f.run('slabOpening.create', {
      storeyId: f.storeyId,
      rect: { a: vec(2500, 1000), b: vec(3000, 1500) },
    });
    const d = bySide(elementOutlineTempDimensions(f.model, hole));
    expect(d['x+']?.value).toBe(500);
    expect((d['x+']?.other as OutlineRef).ownerId).toBe(other);
  });

  it('katalog kreslení 3.1: deska měří ven k dalšímu prvku, ne ke svým otvorům', () => {
    const { f, slab } = freeSlab();
    const d = bySide(elementOutlineTempDimensions(f.model, slab));
    expect(d['y+']?.value).toBe(1000);
    expect(d['x-']).toBeUndefined();
  });

  it('katalog kreslení 3.1: rozpracovaný obrys (i jediný bod) má kóty bez vlastníka', () => {
    const { f } = scene();
    const d = bySide(outlineTempDimensions(f.model, f.storeyId, [vec(300, 200)]));
    expect(d['x-']?.value).toBe(300);
    expect(d['y-']?.value).toBe(200);
    expect(d['x-']?.own).toBeNull();
  });

  it('katalog kreslení 3.3 / základ 25: outline.setDistance posune otvor, stěna stojí; Undo vrátí', () => {
    const { f, hole } = scene();
    f.run('outline.setDistance', { elementId: hole, side: 'x-', value: 600 });
    expect(f.model.slabOpenings[hole]!.outline[0]).toEqual(vec(600, 1000));
    f.run('outline.setDistance', { elementId: hole, side: 'y+', value: 1000 });
    expect(f.model.slabOpenings[hole]!.outline[0]).toEqual(vec(600, 1500));
    f.editor.undo();
    expect(f.model.slabOpenings[hole]!.outline[0]).toEqual(vec(600, 1000));
  });

  it('katalog kreslení 3.3: outline.setDistance u desky posune desku i s jejím otvorem', () => {
    const { f, slab, hole } = freeSlab();
    f.run('outline.setDistance', { elementId: slab, side: 'y+', value: 400 });
    expect(f.model.elements[slab]).toMatchObject({ outline: expect.arrayContaining([vec(0, 600)]) });
    expect(f.model.slabOpenings[hole]!.outline[0]).toEqual(vec(1000, 1600));
  });

  it('katalog kreslení 3.3: strana bez prvku = čitelná chyba', () => {
    const { f, slab } = freeSlab();
    const r = f.editor.execute('outline.setDistance', { elementId: slab, side: 'x-', value: 100 });
    expect(r.ok ? '' : r.error.code).toBe('not-found');
  });
});
