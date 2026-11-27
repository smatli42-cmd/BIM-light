import { describe, expect, it } from 'vitest';
import { fixture, type Fixture } from '../testing/fixture.ts';
import { materialUsage } from '../material/usage.ts';
import { normalizeOutline, outlineError, slabLevels } from './geometry.ts';
import { allSlabs, getSlab } from './queries.ts';

const typeId = (f: Fixture, name: string) =>
  Object.values(f.model.slabTypes).find((t) => t.name === name)!.id;
const rect = { a: { x: 0, y: 0 }, b: { x: 4000, y: 3000 } };
const make = (f: Fixture, name: string, extra: Record<string, unknown> = {}) =>
  f.run('slab.create', { storeyId: f.storeyId, typeId: typeId(f, name), rect, ...extra })[0]!;
const tryRun = (f: Fixture, name: string, params: unknown) => f.editor.execute(name, params);

describe('rozhodnutí sekce 5 / D1: deska', () => {
  it('sekce 5: strop a podlaha jsou dvě samostatné desky; nový projekt má typy obou', () => {
    const f = fixture();
    const fns = Object.values(f.model.slabTypes).map((t) => t.slabFunction);
    expect(fns).toContain('structure');
    expect(fns).toContain('floor');
    for (const t of Object.values(f.model.slabTypes))
      expect(f.model.compositions[t.compositionId]?.use.slab).toBe(true);
  });

  it('D1: referenční rovina = horní líc, tloušťka dolů; podlaha na úrovni podlaží, strop pod podlahou', () => {
    const f = fixture();
    const floorId = make(f, 'Podlaha anhydrit 150');
    const rcId = make(f, 'ŽB strop 250');
    const floor = getSlab(f.model, floorId);
    const rc = getSlab(f.model, rcId);
    expect(slabLevels(f.model, floor)).toEqual({ top: 0, bottom: -150, thickness: 150 });
    expect(slabLevels(f.model, rc)).toEqual({ top: -150, bottom: -410, thickness: 260 });
    expect([floor.ifcClass, rc.ifcClass]).toEqual(['IfcCovering', 'IfcSlab']);
  });

  it('D1: obrys se uloží proti směru hodin a bez opakovaného bodu', () => {
    const cw = [
      { x: 0, y: 0 },
      { x: 0, y: 1000 },
      { x: 1000, y: 1000 },
      { x: 1000, y: 0 },
      { x: 0, y: 0 },
    ];
    const out = normalizeOutline(cw);
    expect(out).toHaveLength(4);
    expect(out[1]).toEqual({ x: 1000, y: 0 });
  });

  it('D1: obrys s křížícími se hranami nebo nulovou plochou příkaz odmítne', () => {
    const bow = [
      { x: 0, y: 0 },
      { x: 1000, y: 1000 },
      { x: 1000, y: 0 },
      { x: 0, y: 1000 },
    ];
    expect(outlineError(bow)).toMatch(/kříží/);
    const f = fixture();
    const r = tryRun(f, 'slab.create', {
      storeyId: f.storeyId,
      typeId: typeId(f, 'ŽB strop 250'),
      outline: bow,
    });
    expect(r.ok).toBe(false);
    const line = [
      { x: 0, y: 0 },
      { x: 500, y: 0 },
      { x: 1000, y: 0 },
    ];
    expect(outlineError(line)).toMatch(/plochu/);
  });

  it('základ 25: posun desky a bodu obrysu hýbe jen deskou, stěny stojí', () => {
    const f = fixture();
    const w = f.line({ x: 0, y: 0 }, { x: 4000, y: 0 });
    const id = make(f, 'ŽB strop 250');
    f.run('slab.move', { slabIds: [id], vector: { x: 100, y: 0 } });
    expect(getSlab(f.model, id).outline[0]).toEqual({ x: 100, y: 0 });
    expect(f.wall(w).path.start).toEqual({ x: 0, y: 0 });
    const [copy] = f.run('slab.move', { slabIds: [id], vector: { x: 0, y: 5000 }, copy: true });
    expect(allSlabs(f.model)).toHaveLength(2);
    expect(getSlab(f.model, copy!).outline[0]).toEqual({ x: 100, y: 5000 });
  });

  it('koncepce rozhraní 11a: typ desky smí jen skladbu „pro desku“; používanou skladbu nejde smazat', () => {
    const f = fixture();
    const t = f.model.slabTypes[typeId(f, 'ŽB strop 250')]!;
    const wallComp = Object.values(f.model.compositions).find((c) => c.use.wall && !c.use.slab)!;
    expect(tryRun(f, 'slabType.update', { typeId: t.id, compositionId: wallComp.id }).ok).toBe(false);
    expect(tryRun(f, 'composition.delete', { compositionId: t.compositionId }).ok).toBe(false);
    expect(tryRun(f, 'composition.setUse', { compositionId: t.compositionId, slab: false }).ok).toBe(false);
  });

  it('D1: typ desky jde duplikovat; používaný typ nejde smazat', () => {
    const f = fixture();
    const id = make(f, 'ŽB strop 250');
    const t = getSlab(f.model, id).typeId;
    expect(tryRun(f, 'slabType.delete', { typeId: t }).ok).toBe(false);
    const [copy] = f.run('slabType.duplicate', { typeId: t });
    expect(f.model.slabTypes[copy!]?.source).toBeUndefined();
    f.run('slabType.delete', { typeId: copy });
    expect(f.model.slabTypes[copy!]).toBeUndefined();
  });

  it('katalog šraf a materiálů: materiál ve skladbě desky se počítá do použití', () => {
    const f = fixture();
    const anhydrite = Object.values(f.model.materials).find((m) => m.name === 'Anhydrit')!;
    make(f, 'Podlaha anhydrit 150');
    expect(materialUsage(f.model, anhydrite.id)).toEqual({ elements: 1, types: 1 });
    expect(tryRun(f, 'material.delete', { materialId: anhydrite.id }).ok).toBe(false);
  });

  it('D1: podlaží s deskou nejde smazat; smazání desky přes výběr', () => {
    const f = fixture();
    f.run('storey.create', { name: '2.NP', elevation: 3000, height: 3000 });
    const id = make(f, 'ŽB strop 250');
    expect(tryRun(f, 'storey.delete', { storeyId: f.storeyId }).ok).toBe(false);
    f.run('selection.delete', { slabIds: [id] });
    expect(allSlabs(f.model)).toHaveLength(0);
  });
});
