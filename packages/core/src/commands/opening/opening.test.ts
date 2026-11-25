import { describe, expect, it } from 'vitest';
import { vec } from '../../geometry/index.ts';
import { stationAt } from '../../opening/along.ts';
import { fixture, room } from '../../testing/fixture.ts';
import { ownerAt } from '../../testing/junction.ts';

function setup() {
  const f = fixture();
  const w = f.line(vec(0, 0), vec(6000, 0));
  const [o] = f.run('opening.create', { wallId: w, offset: 2000, width: 1200 });
  const op = () => f.model.openings[o as string];
  const fails = (name: string, params: unknown) => {
    const r = f.editor.execute(name, params);
    return r.ok ? null : r.error.message;
  };
  return { f, w, o: o as string, op, fails };
}

describe('plan-steny / Z4: příkazy otvoru', () => {
  it('vytvoření středem v bodě kliknutí, posun po stěně a změna šířky kolem středu', () => {
    const { f, w, op } = setup();
    const [c] = f.run('opening.create', { wallId: w, center: vec(4800, 150), width: 1000 });
    expect(f.model.openings[c as string]?.offset).toBeCloseTo(4300);
    const id = op()?.id as string;
    f.run('opening.move', { openingIds: [id], distance: -500 });
    expect(op()?.offset).toBe(1500);
    f.run('opening.update', { openingIds: [id], width: 800 });
    expect(op()?.offset).toBe(1700);
    expect(op()?.width).toBe(800);
  });

  it('otvor nesmí vyčnívat ze stěny ani přesáhnout její výšku; otvory se nepřekrývají', () => {
    const { f, w, o, fails } = setup();
    expect(fails('opening.move', { openingIds: [o], distance: 3000 })).toMatch(/vyčníval/);
    expect(fails('opening.update', { openingIds: [o], height: 2500 })).toMatch(/výšku stěny \(3000 mm\)/);
    expect(fails('opening.create', { wallId: w, offset: 2500, width: 600 })).toMatch(/překrývá/);
    expect(f.model.openings[o]?.offset).toBe(2000);
  });

  it('posun vektorem přenese otvor na jinou stěnu pod středem', () => {
    const { f, o, op } = setup();
    const b = f.line(vec(0, 3000), vec(6000, 3000));
    f.run('opening.move', { openingIds: [o], vector: vec(1000, 3000) });
    expect(op()?.hostId).toBe(b);
    expect(op()?.offset).toBeCloseTo(3000);
  });

  it('kopie (pole) a zrcadlení otvoru v téže stěně', () => {
    const { f, w, o } = setup();
    const ids = f.run('opening.copy', { openingIds: [o], vectors: [vec(1500, 0), vec(2700, 0)] });
    expect(ids.map((id) => f.model.openings[id]?.offset)).toEqual([3500, 4700]);
    f.run('opening.delete', { openingIds: [...ids] });
    const [m] = f.run('opening.mirror', {
      openingIds: [o],
      a: vec(4000, -1000),
      b: vec(4000, 1000),
      copy: true,
    });
    expect(f.model.openings[m as string]?.offset).toBeCloseTo(4800);
    expect(f.model.openings[m as string]?.hostId).toBe(w);
  });

  it('nika musí být mělčí než stěna', () => {
    const { f, w, fails } = setup();
    expect(
      fails('opening.create', { wallId: w, offset: 4000, width: 600, kind: 'niche', depth: 300 }),
    ).toMatch(/Hloubka niky/);
    expect(
      f.run('opening.create', { wallId: w, offset: 4000, width: 600, kind: 'niche', depth: 100 }),
    ).toHaveLength(1);
  });
});

describe('plan-steny / Z4: vazby otvoru na stěnu', () => {
  it('posun, otočení a odsazení stěny: otvor jde se stěnou', () => {
    const { f, w, op } = setup();
    f.run('wall.move', { wallIds: [w], vector: vec(500, 1000) });
    expect(op()?.offset).toBe(2000);
    expect(ownerAt(f, vec(3100, 1150))).toBe('');
    f.run('wall.rotate', { wallIds: [w], center: vec(500, 1000), angleDeg: 90 });
    expect(op()?.offset).toBeCloseTo(2000);
  });

  it('kopie, zrcadlení a pole stěny nesou otvory; smazání stěny smaže otvory', () => {
    const { f, w } = setup();
    const copies = f.run('wall.copy', {
      wallIds: [w],
      transforms: [
        { kind: 'translate', vector: vec(0, 2000) },
        { kind: 'mirror', a: vec(0, -2000), b: vec(6000, -2000) },
      ],
    });
    const hosted = (id: string) => Object.values(f.model.openings).filter((x) => x.hostId === id);
    for (const c of copies) expect(hosted(c).map((x) => x.offset)).toEqual([2000]);
    expect(ownerAt(f, vec(2600, 2150))).toBe('');
    f.run('selection.delete', { wallIds: [w, ...copies] });
    expect(Object.keys(f.model.openings)).toHaveLength(0);
  });

  it('změna délky: uchopený konec; otvor stojí na místě, zkrácení přes otvor se odmítne', () => {
    const { f, w, op, fails } = setup();
    f.run('wall.moveEndpoint', { wallId: w, end: 'start', point: vec(-1000, 0) });
    expect(op()?.offset).toBe(3000);
    expect(stationAt(f.wall(w).path, op()?.offset ?? 0).point.x).toBeCloseTo(2000);
    expect(fails('wall.moveEndpoint', { wallId: w, end: 'end', point: vec(2500, 0) })).toMatch(/vyčníval/);
    expect(fails('wall.moveEndpoint', { wallId: w, end: 'start', point: vec(2500, 0) })).toMatch(/vyčníval/);
  });

  it('rozdělení: přes otvor se odmítne, jinde otvor přejde na část, ve které leží', () => {
    const { f, w, op, fails } = setup();
    expect(fails('wall.split', { wallId: w, point: vec(2500, 0) })).toMatch(/přes otvor/);
    const [b] = f.run('wall.split', { wallId: w, point: vec(1000, 0) });
    expect(op()?.hostId).toBe(b);
    expect(op()?.offset).toBeCloseTo(1000);
    f.run('wall.deleteNode', { wallId: w, end: 'end' });
    expect(op()?.hostId).toBe(w);
    expect(op()?.offset).toBeCloseTo(2000);
  });

  it('změna tloušťky a typu nemění polohu otvoru vůči referenční čáře', () => {
    const { f, w, op } = setup();
    f.run('wall.setThickness', { wallId: w, thickness: 450 });
    f.run('wall.setType', { wallIds: [w], typeId: f.type('Nosná zeď 330') });
    expect(op()?.offset).toBe(2000);
  });

  it('kontrola proti výšce stěny: snížení stěny nebo podlaží pod otvor se odmítne s vysvětlením', () => {
    const { f, w, fails } = setup();
    const low = { baseOffset: 0, top: { kind: 'height', value: 2000 } };
    expect(fails('wall.setHeight', { wallIds: [w], height: low })).toMatch(/přesáhl výšku stěny \(2000 mm\)/);
    expect(fails('storey.update', { storeyId: f.storeyId, height: 2200 })).toMatch(/výšku stěny/);
    f.run('storey.update', { storeyId: f.storeyId, height: 2500 });
  });

  it('otvor u rohu místnosti jde se stěnou při posunu sousední stěny (natažení)', () => {
    const f = fixture();
    const [left, top] = room(f);
    const [o] = f.run('opening.create', { wallId: top, offset: 1000, width: 900 });
    f.run('wall.move', { wallIds: [left], vector: vec(-500, 0) });
    const t = f.wall(top);
    expect(stationAt(t.path, f.model.openings[o as string]?.offset ?? 0).point.x).toBeCloseTo(1000);
  });

  it('jedno Undo vrátí otvor i výřez', () => {
    const { f } = setup();
    expect(ownerAt(f, vec(2600, 150))).toBe('');
    f.editor.undo();
    expect(Object.keys(f.model.openings)).toHaveLength(0);
    expect(ownerAt(f, vec(2600, 150))).toBe('Zdivo keramické');
  });
});
