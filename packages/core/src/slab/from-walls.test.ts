import { describe, expect, it } from 'vitest';
import { vec } from '../geometry/index.ts';
import { fixture, type Fixture } from '../testing/fixture.ts';
import { polygonArea } from './geometry.ts';
import { getSlab } from './queries.ts';

const rcType = (f: Fixture) => Object.values(f.model.slabTypes).find((t) => t.name === 'ŽB strop 250')!.id;
const room = (f: Fixture, type: string) =>
  f.run('wall.rectangle', { storeyId: f.storeyId, typeId: f.type(type), a: vec(0, 0), b: vec(4000, 3000) });
const fromWalls = (f: Fixture, wallIds: readonly string[], boundary?: string) =>
  f.editor.execute('slab.create', {
    storeyId: f.storeyId,
    typeId: rcType(f),
    walls: boundary ? { wallIds, boundary } : { wallIds },
  });
const box = (f: Fixture, id: string) => {
  const o = getSlab(f.model, id).outline;
  const xs = o.map((p) => p.x);
  const ys = o.map((p) => p.y);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)].map((v) => Math.round(v));
};

describe('D2: deska podle stěn (Revit „Vybrat stěny“)', () => {
  it('D2: obrys po vnitřním líci obdélníku stěn', () => {
    const f = fixture();
    const r = fromWalls(f, room(f, 'Zdivo 300'));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(getSlab(f.model, r.created[0]!).outline).toHaveLength(4);
    expect(box(f, r.created[0]!)).toEqual([0, 0, 4000, 3000]);
  });

  it('D2: pořadí a směr stěn nehraje roli; stěny kreslené osou dají vnitřní líc', () => {
    const f = fixture();
    const ax = { referenceLine: 'axis' };
    const ids = [
      f.line(vec(4000, 0), vec(4000, 3000), ax),
      f.line(vec(0, 0), vec(4000, 0), ax),
      f.line(vec(0, 3000), vec(0, 0), ax),
      f.line(vec(4000, 3000), vec(0, 3000), ax),
    ];
    const r = fromWalls(f, ids);
    expect(r.ok && box(f, r.created[0]!)).toEqual([150, 150, 3850, 2850]);
  });

  it('D2: boundary core = vnitřní líc nosného jádra (omítka se přeskočí)', () => {
    const f = fixture();
    const ids = room(f, 'Obvodová zateplená 465');
    const face = fromWalls(f, ids, 'face');
    const core = fromWalls(f, ids, 'core');
    expect(face.ok && box(f, face.created[0]!)).toEqual([0, 0, 4000, 3000]);
    expect(core.ok && box(f, core.created[0]!)).toEqual([-15, -15, 4015, 3015]);
  });

  it('základ 23: oblouková stěna dá oblouk rozložený na body', () => {
    const f = fixture();
    const ax = { referenceLine: 'axis' };
    const ids = [
      f.line(vec(0, 0), vec(4000, 0), ax),
      f.run('wall.create', {
        storeyId: f.storeyId,
        typeId: f.type('Zdivo 300'),
        path: { kind: 'arc', start: vec(4000, 0), end: vec(0, 0), bulge: 1 },
        referenceLine: 'axis',
      })[0]!,
    ];
    const r = fromWalls(f, ids);
    expect(r.ok ? 'ok' : r.error.message).toBe('ok');
    if (!r.ok) return;
    const s = getSlab(f.model, r.created[0]!);
    expect(s.outline.length).toBeGreaterThan(8);
    // Půlkruh o poloměru 2000 − 150 nad úsečkou posunutou o 150 nahoru: plocha menší než půlkruh 2000.
    const area = polygonArea(s.outline);
    expect(area).toBeLessThan((Math.PI * 2000 ** 2) / 2);
    expect(area).toBeGreaterThan((Math.PI * 1700 ** 2) / 2);
  });

  it('D2: jednu stěnu příkaz odmítne (obrys potřebuje smyčku)', () => {
    const f = fixture();
    const one = fromWalls(f, [f.line(vec(0, 0), vec(4000, 0))]);
    expect(one.ok).toBe(false);
  });
});
