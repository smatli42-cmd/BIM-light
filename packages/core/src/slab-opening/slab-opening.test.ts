import { describe, expect, it } from 'vitest';
import { drawView } from '../view/draw-view.ts';
import { parseProject, serializeProject } from '../persistence/project-file.ts';
import { vec } from '../geometry/index.ts';
import { boxSelect, rectOf } from '../selection/box.ts';
import { fixture, type Fixture } from '../testing/fixture.ts';
import { slabNetArea } from './geometry.ts';
import { slabOpeningsAt } from './pick.ts';
import { getSlab } from '../slab/queries.ts';

const typeId = (f: Fixture, name: string) =>
  Object.values(f.model.slabTypes).find((t) => t.name === name)!.id;
const slab = (f: Fixture, name: string, extra: Record<string, unknown> = {}) =>
  f.run('slab.create', {
    storeyId: f.storeyId,
    typeId: typeId(f, name),
    rect: { a: vec(0, 0), b: vec(6000, 4000) },
    ...extra,
  })[0]!;
const hole = (f: Fixture, extra: Record<string, unknown> = {}) =>
  f.run('slabOpening.create', {
    storeyId: f.storeyId,
    rect: { a: vec(1000, 1000), b: vec(2000, 3000) },
    ...extra,
  })[0]!;

describe('základ 19 / prvky stavby 15 / D3: otvor v desce', () => {
  it('prvky stavby 15: otvor ořízne nosný strop i podlahu najednou; čistá plocha bez otvoru', () => {
    const f = fixture();
    const rc = slab(f, 'ŽB strop 250');
    const floor = slab(f, 'Podlaha anhydrit 150');
    slab(f, 'ŽB strop 250', { rect: { a: vec(9000, 0), b: vec(12000, 3000) } });
    const id = hole(f);
    const o = f.model.slabOpenings[id]!;
    expect([...o.hostIds].sort()).toEqual([rc, floor].sort());
    expect(o.ifcClass).toBe('IfcOpeningElement');
    expect(slabNetArea(f.model, getSlab(f.model, rc))).toBe(24e6 - 2e6);
  });

  it('D3: otvor mimo desky příkaz odmítne', () => {
    const f = fixture();
    slab(f, 'ŽB strop 250');
    const r = f.editor.execute('slabOpening.create', {
      storeyId: f.storeyId,
      rect: { a: vec(8000, 0), b: vec(9000, 1000) },
    });
    expect(r.ok).toBe(false);
  });

  it('prvky stavby 15: v půdorysu obrys a úhlopříčky; nad rovinou řezu čárkovaně', () => {
    const f = fixture();
    slab(f, 'ŽB strop 250');
    const id = hole(f);
    const lines = (d: ReturnType<typeof drawView>) =>
      d.primitives.filter((p) => p.kind === 'line' && p.source.elementId === id);
    const below = lines(drawView(f.model, f.viewId));
    expect(below).toHaveLength(3);
    expect(below.every((p) => p.kind === 'line' && p.stroke.lineType === 'solid')).toBe(true);
    f.run('slab.update', { slabIds: Object.keys(f.model.elements), topOffset: 2900 });
    const above = lines(drawView(f.model, f.viewId));
    expect(above.every((p) => p.kind === 'line' && p.stroke.lineType === 'dashed')).toBe(true);
  });

  it('základ 25 / D3: posun desky vezme otvor s sebou, posun otvoru desku nechá; bod obrysu', () => {
    const f = fixture();
    const rc = slab(f, 'ŽB strop 250');
    const id = hole(f);
    f.run('slab.move', { slabIds: [rc], vector: vec(500, 0) });
    expect(f.model.slabOpenings[id]!.outline[0]).toEqual(vec(1500, 1000));
    f.run('slabOpening.move', { openingIds: [id], vector: vec(0, 500) });
    expect(f.model.slabOpenings[id]!.outline[0]).toEqual(vec(1500, 1500));
    expect(getSlab(f.model, rc).outline[0]).toEqual(vec(500, 0));
    f.run('slabOpening.moveVertex', { openingId: id, index: 2, point: vec(3000, 3500) });
    expect(f.model.slabOpenings[id]!.outline[2]).toEqual(vec(3000, 3500));
  });

  it('základ 7: smazáním desky zmizí z hostitelů; otvor bez desky zanikne; Del smaže otvor', () => {
    const f = fixture();
    const rc = slab(f, 'ŽB strop 250');
    const floor = slab(f, 'Podlaha anhydrit 150');
    const id = hole(f);
    f.run('selection.delete', { slabIds: [floor] });
    expect(f.model.slabOpenings[id]!.hostIds).toEqual([rc]);
    f.run('selection.delete', { slabIds: [rc] });
    expect(f.model.slabOpenings[id]).toBeUndefined();
    slab(f, 'ŽB strop 250');
    const again = hole(f);
    f.run('selection.delete', { slabOpeningIds: [again] });
    expect(Object.keys(f.model.slabOpenings)).toHaveLength(0);
  });

  it('Výběr: klik do otvoru a rámeček vyberou otvor v desce', () => {
    const f = fixture();
    slab(f, 'ŽB strop 250');
    const id = hole(f);
    const view = f.model.views[f.viewId]!;
    expect(slabOpeningsAt(f.model, view, vec(1500, 2000), 5)).toEqual([id]);
    expect(boxSelect(f.model, view, rectOf(vec(900, 900), vec(2100, 3100)), false).slabOpeningIds).toEqual([
      id,
    ]);
  });

  it('základ 9: migrace 18 → 19 doplní prázdné otvory v deskách', () => {
    const f = fixture();
    const raw = JSON.parse(serializeProject(f.model)) as Record<string, unknown>;
    const { slabOpenings: _s, ...old } = raw;
    const r = parseProject(JSON.stringify({ ...old, schemaVersion: 18 }));
    expect(r.ok && r.model.slabOpenings).toEqual({});
  });
});
