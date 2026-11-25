import { describe, expect, it } from 'vitest';
import type { Primitive } from '../drawing/primitives.ts';
import { libraryHatch } from '../hatch/registry.ts';
import { fixture, type Fixture } from '../testing/fixture.ts';
import { drawView } from '../view/draw-view.ts';
import { mixColor } from './colors.ts';

const toProject = (f: Fixture) => f.run('view.setStyle', { viewId: f.viewId, styleId: f.style('Projekt') });
const hatches = (f: Fixture) =>
  drawView(f.model, f.viewId).primitives.filter(
    (p): p is Extract<Primitive, { kind: 'hatch' }> => p.kind === 'hatch',
  );
const matId = (f: Fixture, name: string) => Object.values(f.model.materials).find((m) => m.name === name)!.id;

describe('katalog-sraf-materialu / materiál odkazuje šrafu', () => {
  it('materiály odkazují jen šrafy, které projekt má (kopie s odkazem na původ)', () => {
    const f = fixture();
    for (const m of Object.values(f.model.materials)) {
      const h = f.model.display.hatches[m.hatchId];
      expect(h, m.name).toBeTruthy();
      expect(h?.source).toEqual({
        libraryId: 'bim-light-hatches',
        itemId: m.hatchId,
        version: libraryHatch(m.hatchId)?.version,
      });
    }
  });

  it('materiál neukládá vlastnosti ze seznamu „zatím nedělej“', () => {
    const f = fixture();
    const keys = new Set(Object.values(f.model.materials).flatMap((m) => Object.keys(m)));
    for (const k of ['lambda', 'density', 'heatCapacity', 'gwp', 'mu', 'price', 'airLayer'])
      expect(keys.has(k)).toBe(false);
  });

  it('změna šrafy v projektu změní vzhled všech materiálů, které ji používají', () => {
    const f = fixture();
    f.line({ x: 0, y: 0 }, { x: 5000, y: 0 });
    f.line({ x: 0, y: 2000 }, { x: 5000, y: 2000 }, { typeId: f.type('Příčka 125') });
    toProject(f);
    const zdivo = f.model.display.hatches['hatch.zdivo']!;
    const changed = { ...zdivo, families: libraryHatch('hatch.zdivo-mrizka')!.families };
    f.editor.load({
      ...f.model,
      display: { ...f.model.display, hatches: { ...f.model.display.hatches, 'hatch.zdivo': changed } },
    });
    const hs = hatches(f);
    expect(hs).toHaveLength(2);
    expect(hs.every((h) => h.hatch.families.length === 2)).toBe(true);
  });

  it('změna barvy materiálu nezmění šrafu, jen barvy čar a výplně', () => {
    const f = fixture();
    f.line({ x: 0, y: 0 }, { x: 5000, y: 0 });
    toProject(f);
    const before = hatches(f)[0]!;
    f.run('material.update', { materialId: matId(f, 'Zdivo keramické'), color: '#0000ff' });
    const after = hatches(f)[0]!;
    expect(after.hatch).toEqual(before.hatch);
    expect(after.lineColor).toBe(mixColor('#0000ff', 0, 0.7));
    expect(after.fillColor).toBe(mixColor('#0000ff', 255, 0.65));
  });

  it('změna šrafy materiálu doplní kopii šrafy do projektu', () => {
    const f = fixture();
    expect(f.model.display.hatches['hatch.kamen']).toBeUndefined();
    f.run('material.update', { materialId: matId(f, 'Omítka'), hatchId: 'hatch.kamen' });
    expect(f.model.display.hatches['hatch.kamen']?.source?.itemId).toBe('hatch.kamen');
    expect(
      f.editor.execute('material.update', { materialId: matId(f, 'Omítka'), hatchId: 'hatch.nic' }).ok,
    ).toBe(false);
  });

  it('smazání použitého materiálu bez náhrady se odmítne, s náhradou se vrstvy přepíšou', () => {
    const f = fixture();
    const zdivo = matId(f, 'Zdivo keramické');
    const r = f.editor.execute('material.delete', { materialId: zdivo });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error.message).toMatch(/skladeb/);
    f.run('material.delete', { materialId: zdivo, replacementId: matId(f, 'Cihly plné') });
    expect(f.model.materials[zdivo]).toBeUndefined();
    const used = Object.values(f.model.wallTypes).flatMap((t) => t.bands[0]!.layers.map((l) => l.materialId));
    expect(used).not.toContain(zdivo);
  });

  it('nový a duplikovaný materiál: jedinečný název, priorita podle kategorie', () => {
    const f = fixture();
    const [id] = f.run('material.create', {
      name: 'Pórobeton',
      category: 'Zdivo',
      color: '#eeeeee',
      hatchId: 'hatch.zdivo',
    });
    expect(f.model.materials[id!]?.joinPriority).toBe(50);
    expect(
      f.editor.execute('material.create', {
        name: 'Pórobeton',
        category: 'Zdivo',
        color: '#eeeeee',
        hatchId: 'hatch.zdivo',
      }).ok,
    ).toBe(false);
    const [copy] = f.run('material.duplicate', { materialId: id });
    expect(f.model.materials[copy!]?.name).toBe('Pórobeton (kopie)');
    expect(f.model.materials[copy!]?.hatchId).toBe('hatch.zdivo');
  });

  it('materiál vrstvy: okamžitý vzhled šrafy v řezu (jedno Undo)', () => {
    const f = fixture();
    f.line({ x: 0, y: 0 }, { x: 5000, y: 0 });
    toProject(f);
    f.run('wallType.setLayerMaterial', {
      typeId: f.type('Zdivo 300'),
      layerIndex: 0,
      materialId: matId(f, 'Železobeton'),
    });
    expect(hatches(f)[0]?.hatch.id).toBe('hatch.beton-vyztuzeny');
    f.editor.undo();
    expect(hatches(f)[0]?.hatch.id).toBe('hatch.zdivo');
  });
});
