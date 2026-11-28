import { describe, expect, it } from 'vitest';
import type { Opening } from '../opening/types.ts';
import { slabLevels } from '../slab/geometry.ts';
import type { Slab } from '../slab/types.ts';
import { fixture, type Fixture } from '../testing/fixture.ts';
import { wallHeight } from '../wall-height/resolve.ts';
import { edgeCall, edgeLevel } from './edge-level.ts';
import { sectionGrips, sectionSnapLevels, snapLevel } from './grips.ts';
import type { Section } from './types.ts';

const v = (x: number, y: number) => ({ x, y });

/** Stěna podél x s oknem, strop nad ní; řez napříč v x = 3000 (stěna na výkrese v u = 2000). */
function scene(f: Fixture) {
  const wall = f.line(v(0, 0), v(6000, 0));
  const typeId = Object.values(f.model.slabTypes).find((t) => t.name === 'ŽB strop 250')?.id;
  const [slab] = f.run('slab.create', {
    storeyId: f.storeyId,
    typeId,
    rect: { a: v(0, -1000), b: v(6000, 4000) },
    topOffset: 3500,
  });
  const [win] = f.run('opening.create', { wallId: wall, offset: 2500, width: 1000, sill: 900, height: 1200 });
  const [id] = f.run('section.create', { start: v(3000, -2000), end: v(3000, 5000) });
  return { wall, slab: slab as string, win: win as string, s: f.model.sections[id as string] as Section };
}

const drag = (f: Fixture, elementId: string, edge: 'top' | 'bottom', z: number) =>
  f.run('element.setEdgeLevel', { elementId, edge, z });

describe('pravidla-interakce / základ 25: úchopy v řezu (pokyn uživatele 2026-11-27)', () => {
  it('úchopy v řezu: vybraná stěna, deska a otvor mají horní a spodní úchop na své hraně', () => {
    const f = fixture();
    const { wall, slab, win, s } = scene(f);
    const g = sectionGrips(f.model, s, [wall, slab, win]);
    expect(g).toHaveLength(6);
    const wt = g.find((x) => x.elementId === wall && x.edge === 'top');
    expect(wt).toMatchObject({ z: wallHeight(f.model, f.wall(wall)).top, label: 'Výška' });
    expect(Math.abs((wt?.u ?? 0) - 2000)).toBeLessThan(400);
    expect(g.find((x) => x.elementId === win && x.edge === 'bottom')).toMatchObject({
      z: 900,
      label: 'Parapet',
      value: 900,
    });
    const bottom = slabLevels(f.model, f.model.elements[slab] as Slab).bottom;
    expect(g.find((x) => x.elementId === slab && x.edge === 'bottom')?.z).toBe(bottom);
  });

  it('základ 12 / Revit: tažení vázaného vršku stěny přepočítá odsazení, vazba na podlaží zůstane', () => {
    const f = fixture();
    const { wall } = scene(f);
    const before = f.wall(wall).height;
    expect(before.top.kind).toBe('storey');
    drag(f, wall, 'top', 2800);
    const h = f.wall(wall).height;
    expect(h.top).toMatchObject({ kind: 'storey', storeys: 1 });
    expect(wallHeight(f.model, f.wall(wall)).top).toBe(2800);
    expect(h.baseOffset).toBe(before.baseOffset);
  });

  it('základ 25: spodek stěny se pohne sám, vršek stojí (i u nespojené stěny)', () => {
    const f = fixture();
    const { wall } = scene(f);
    f.run('wall.setHeight', {
      wallIds: [wall],
      height: { baseOffset: 0, top: { kind: 'height', value: 2600 } },
    });
    drag(f, wall, 'bottom', 200);
    const r = wallHeight(f.model, f.wall(wall));
    expect([r.bottom, r.top]).toEqual([200, 2600]);
    expect(f.wall(wall).height.top).toEqual({ kind: 'height', value: 2400 });
    drag(f, wall, 'top', 2700);
    expect(f.wall(wall).height.top).toEqual({ kind: 'height', value: 2500 });
  });

  it('rozhodl Code (Revit / Archicad): deska ze skladby se tažením posune celá, tloušťka zůstane podle typu', () => {
    const f = fixture();
    const { slab } = scene(f);
    const t0 = slabLevels(f.model, f.model.elements[slab] as Slab).thickness;
    drag(f, slab, 'bottom', 3000);
    const lv = slabLevels(f.model, f.model.elements[slab] as Slab);
    expect([lv.bottom, lv.top, lv.thickness]).toEqual([3000, 3000 + t0, t0]);
    drag(f, slab, 'top', 3400);
    expect((f.model.elements[slab] as Slab).topOffset).toBe(3400);
  });

  it('základ 25: spodní hrana otvoru mění parapet a nadpraží stojí, horní hrana mění výšku otvoru', () => {
    const f = fixture();
    const { win } = scene(f);
    drag(f, win, 'bottom', 600);
    const o = f.model.openings[win] as Opening;
    expect([o.sill, o.height]).toEqual([600, 1500]);
    drag(f, win, 'top', 2200);
    expect((f.model.openings[win] as Opening).height).toBe(1600);
    expect(() => drag(f, win, 'top', 500)).toThrow(/nad spodní/);
    expect(() => drag(f, win, 'bottom', -100)).toThrow(/Parapet/);
  });

  it('základy 6, 15: tažení = jeden příkaz se stejným výsledkem jako volání wall.setHeight / opening.update', () => {
    const f = fixture();
    const { wall, win } = scene(f);
    const c = edgeCall(f.model, wall, 'top', 2900);
    expect(c.command).toBe('wall.setHeight');
    const g = fixture();
    const sc = scene(g);
    g.run(c.command, c.params);
    drag(f, wall, 'top', 2900);
    expect(f.wall(wall).height).toEqual(g.wall(sc.wall).height);
    expect(edgeCall(f.model, win, 'bottom', 800).command).toBe('opening.update');
    // Jedno Undo vrátí celý posun.
    f.editor.undo();
    expect(edgeLevel(f.model, wall, 'top')).not.toBe(2900);
  });

  it('pravidla-interakce / přichytávání v řezu: úrovně podlaží a hrany ostatních prvků, ne vlastní', () => {
    const f = fixture();
    const { wall, slab, s } = scene(f);
    const bottom = slabLevels(f.model, f.model.elements[slab] as Slab).bottom;
    const lv = sectionSnapLevels(f.model, s, wall);
    expect(lv.some((l) => l.z === 0 && l.label !== 'hrana')).toBe(true);
    expect(lv.some((l) => l.z === bottom)).toBe(true);
    expect(snapLevel(lv, bottom - 12, 20)?.z).toBe(bottom);
    expect(snapLevel(lv, bottom - 150, 20)).toBeNull();
    const own = sectionSnapLevels(f.model, s, slab);
    expect(own.some((l) => l.z === bottom && l.label === 'hrana')).toBe(false);
  });
});
