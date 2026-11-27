import { describe, expect, it } from 'vitest';
import { vec } from '../geometry/index.ts';
import { fixture, type Fixture } from '../testing/fixture.ts';
import { wallSection } from '../wall/queries.ts';
import { surfacePoint } from './frame.ts';
import { roomSurfaces } from './surfaces.ts';

/** Obdélník stěn; vrací [horní, pravá, spodní, levá]. */
const rect = (f: Fixture, w = 4000, h = 3000) =>
  f.run('wall.rectangle', { storeyId: f.storeyId, typeId: f.type('Zdivo 300'), a: vec(0, 0), b: vec(w, h) });
const addRoom = (f: Fixture) => f.run('room.create', { storeyId: f.storeyId, point: vec(2000, 1500) })[0]!;
const surfaces = (f: Fixture, id: string) => roomSurfaces(f.model, f.model.rooms[id]!);
const m2 = (mm2: number) => Math.round(mm2 / 1e4) / 100;
const sum = (xs: { area: number }[]) => m2(xs.reduce((s, x) => s + x.area, 0));

describe('prvky stavby 9: plochy povrchů místnosti z modelu', () => {
  it('prvky stavby 9: líce stěn po obvodu, podlaha a strop z obrysu', () => {
    const f = fixture();
    rect(f);
    const s = surfaces(f, addRoom(f));
    expect(s.filter((x) => x.place === 'wall')).toHaveLength(4);
    expect(sum(s.filter((x) => x.place === 'wall'))).toBe(42);
    expect(sum(s.filter((x) => x.place === 'floor'))).toBe(12);
    expect(sum(s.filter((x) => x.place === 'ceiling'))).toBe(12);
  });

  it('prvky stavby 9: otvor ze stěny zmizí (2D rozdíl), ostění přibude jako malé plochy', () => {
    const f = fixture();
    const [left] = rect(f);
    const id = addRoom(f);
    f.run('opening.create', { wallId: left, offset: 1000, width: 1000, height: 1500, sill: 900 });
    const s = surfaces(f, id);
    expect(sum(s.filter((x) => x.place === 'wall'))).toBe(40.5);
    const jambs = s.filter((x) => x.place === 'jamb');
    expect(jambs.map((j) => j.jambPart).sort()).toEqual(['head', 'left', 'right', 'sill']);
    const half = wallSection(f.model, f.model.elements[left!] as never).thickness / 2;
    expect(sum(jambs)).toBe(m2(2 * 1500 * half + 2 * 1000 * half));
    const face = s.find((x) => x.place === 'wall' && x.wallId === left)!;
    expect(face.openings).toEqual([{ openingId: expect.any(String), area: 1.5e6 }]);
  });

  it('základ 14: posun okna i stěny plochy přepočítá, přiřazení zůstane', () => {
    const f = fixture();
    const [, right, , left] = rect(f);
    const id = addRoom(f);
    f.run('opening.create', { wallId: left, offset: 1000, width: 1000, height: 1500, sill: 900 });
    f.run('wall.move', { wallIds: [right], vector: vec(1000, 0) });
    const s = surfaces(f, id);
    expect(sum(s.filter((x) => x.place === 'wall'))).toBe(48 - 1.5);
    expect(sum(s.filter((x) => x.place === 'floor'))).toBe(15);
  });

  it('prvky stavby 9: rámec vrací plochu do 3D – líc leží na stěně, normála do místnosti', () => {
    const f = fixture();
    const [, , , left] = rect(f);
    const s = surfaces(f, addRoom(f));
    const face = s.find((x) => x.place === 'wall' && x.wallId === left)!;
    const outer = face.polygons[0]!.outer;
    const pts = outer.map((p) => surfacePoint(face.frame, p));
    expect(pts.every((p) => Math.abs(p.x) < 1e-6)).toBe(true);
    expect(Math.max(...pts.map((p) => p.z))).toBeCloseTo(3000);
    expect(face.frame.kind === 'plane' && face.frame.normal.x).toBeCloseTo(1);
    const ceiling = s.find((x) => x.place === 'ceiling')!;
    expect(ceiling.frame.kind === 'plane' && ceiling.frame.normal.z).toBe(-1);
    const c = ceiling.polygons[0]!.outer.map((p) => surfacePoint(ceiling.frame, p));
    expect(c.every((p) => p.z === 3000 && p.y >= -1e-6 && p.y <= 3000 + 1e-6)).toBe(true);
  });

  it('prvky stavby 9: ostění leží v tloušťce stěny a míří do otvoru, nika má dno', () => {
    const f = fixture();
    const [top] = rect(f);
    const id = addRoom(f);
    f.run('opening.create', { wallId: top, offset: 1000, width: 1000, height: 1500, sill: 900 });
    const half = wallSection(f.model, f.model.elements[top!] as never).thickness / 2;
    const jambs = surfaces(f, id).filter((x) => x.place === 'jamb');
    for (const j of jambs) {
      const pts = j.polygons[0]!.outer.map((p) => surfacePoint(j.frame, p));
      expect(pts.every((p) => p.y >= 3000 - 1e-6 && p.y <= 3000 + half + 1e-6)).toBe(true);
      const n = j.frame.kind === 'plane' ? j.frame.normal : null;
      const c = { x: pts.reduce((a, p) => a + p.x, 0) / pts.length, z: pts.reduce((a, p) => a + p.z, 0) / 4 };
      if (j.jambPart === 'head') expect(n?.z).toBe(-1);
      if (j.jambPart === 'sill') expect(n?.z).toBe(1);
      if (j.jambPart === 'left' || j.jambPart === 'right')
        expect((n?.x ?? 0) * (1500 - c.x)).toBeGreaterThan(0);
    }
    const [n2] = f.run('opening.create', {
      wallId: top,
      offset: 2500,
      width: 800,
      height: 1000,
      sill: 500,
      kind: 'niche',
      side: 'ref',
      depth: 100,
    });
    const back = surfaces(f, id).find((x) => x.openingId === n2 && x.jambPart === 'back')!;
    expect(m2(back.area)).toBe(0.8);
    expect(back.frame.kind === 'plane' && back.frame.normal.y).toBeCloseTo(-1);
  });
});
