import { describe, expect, it } from 'vitest';
import type { Primitive } from '../../drawing/primitives.ts';
import { parseProject, serializeProject } from '../../persistence/project-file.ts';
import { fixture, type Fixture } from '../../testing/fixture.ts';
import { drawView } from '../../view/draw-view.ts';
import { bandThickness, crossSection } from '../../wall/layers.ts';

const mat = (f: Fixture, name: string) => Object.values(f.model.materials).find((m) => m.name === name)!.id;
const layers = (f: Fixture, typeId: string) => f.model.wallTypes[typeId]!.bands[0]!.layers;
const fails = (f: Fixture, name: string, params: unknown) => {
  const r = f.editor.execute(name, params);
  return r.ok ? '' : r.error.message;
};

/** Typ omítka 15 + zdivo 300 + izolace 150 (Hotovo Z1). */
function threeLayers(f: Fixture) {
  return f.type('Obvodová zateplená 465');
}

describe('plán stěn Z1 / změna tloušťky', () => {
  it('mění jen jádro, povrchové vrstvy zůstanou a vznikne nový typ', () => {
    const f = fixture();
    const id = f.line({ x: 0, y: 0 }, { x: 5000, y: 0 }, { typeId: threeLayers(f) });
    f.run('wall.setThickness', { wallId: id, thickness: 515 });
    const t = f.wall(id).typeId;
    expect(t).not.toBe(threeLayers(f));
    expect(layers(f, t).map((l) => l.thickness)).toEqual([15, 350, 150]);
    expect(f.model.wallTypes[t]!.name).toBe('Obvodová zateplená 515');
  });

  it('referenční líc zůstane na místě', () => {
    const f = fixture();
    const id = f.line({ x: 0, y: 0 }, { x: 5000, y: 0 }, { typeId: threeLayers(f) });
    const before = f.wall(id).path;
    f.run('wall.setThickness', { wallId: id, thickness: 600 });
    expect(f.wall(id).path).toEqual(before);
    const band = f.model.wallTypes[f.wall(id).typeId]!.bands[0]!;
    expect(crossSection(f.wall(id), band).faces.ref).toBe(0);
  });

  it('typ se slučuje s existujícím se stejnou skladbou (katalog kreslení 6)', () => {
    const f = fixture();
    const a = f.line({ x: 0, y: 0 }, { x: 5000, y: 0 });
    const b = f.line({ x: 0, y: 2000 }, { x: 5000, y: 2000 });
    f.run('wall.setThickness', { wallId: a, thickness: 125 });
    expect(f.wall(a).typeId).toBe(f.type('Příčka 125'));
    f.run('wall.setThickness', { wallId: b, thickness: 450 });
    const count = Object.keys(f.model.wallTypes).length;
    f.run('wall.setThickness', { wallId: a, thickness: 450 });
    expect(f.wall(a).typeId).toBe(f.wall(b).typeId);
    expect(Object.keys(f.model.wallTypes)).toHaveLength(count);
  });
});

describe('plán stěn Z1 / příkazy typu', () => {
  it('vytvoř typ: součet vrstev = tloušťka; neplatné jádro se odmítne', () => {
    const f = fixture();
    const layer = (name: string, thickness: number, fn: string) => ({
      materialId: mat(f, name),
      thickness,
      function: fn,
    });
    const [id] = f.run('wallType.create', {
      name: 'Test 3 vrstvy',
      layers: [
        layer('Omítka', 15, 'finish'),
        layer('Zdivo keramické', 240, 'core'),
        layer('Minerální vata', 100, 'insulation'),
      ],
    });
    expect(bandThickness(f.model.wallTypes[id!]!.bands[0]!)).toBe(355);
    const msg = fails(f, 'wallType.create', {
      name: 'Špatný',
      layers: [
        layer('Zdivo keramické', 100, 'core'),
        layer('Omítka', 10, 'finish'),
        layer('Zdivo keramické', 100, 'core'),
      ],
    });
    expect(msg).toMatch(/souvislá/);
  });

  it('duplikát nemá odkaz na knihovnu a má volný název', () => {
    const f = fixture();
    const [id] = f.run('wallType.duplicate', { typeId: f.type('Zdivo 300') });
    const t = f.model.wallTypes[id!]!;
    expect(t.name).toBe('Zdivo 300 (2)');
    expect(t.source).toBeUndefined();
  });

  it('přejmenování na obsazený název se odmítne', () => {
    const f = fixture();
    expect(fails(f, 'wallType.rename', { typeId: f.type('Zdivo 300'), name: 'Příčka 125' })).toMatch(
      /už v projektu/,
    );
  });

  it('vrstvy: přidat, přesunout, upravit, smazat; stěny typu drží referenční líc', () => {
    const f = fixture();
    const t = f.type('Zdivo 300');
    const id = f.line({ x: 0, y: 0 }, { x: 5000, y: 0 });
    const path = f.wall(id).path;
    f.run('wallType.addLayer', {
      typeId: t,
      layer: { materialId: mat(f, 'Omítka'), thickness: 15, function: 'finish' },
    });
    f.run('wallType.moveLayer', { typeId: t, from: 1, to: 0 });
    expect(layers(f, t).map((l) => l.function)).toEqual(['finish', 'core']);
    f.run('wallType.updateLayer', { typeId: t, layerIndex: 0, thickness: 20, extendTop: 50 });
    expect(layers(f, t)[0]).toMatchObject({ thickness: 20, extendTop: 50, extendBottom: 0 });
    expect(f.wall(id).path).toEqual(path);
    f.run('wallType.removeLayer', { typeId: t, layerIndex: 0 });
    expect(layers(f, t)).toHaveLength(1);
    expect(fails(f, 'wallType.removeLayer', { typeId: t, layerIndex: 0 })).toMatch(/aspoň jednu/);
  });

  it('smazání použitého typu chce náhradu; s náhradou stěny dostanou náhradní typ', () => {
    const f = fixture();
    const id = f.line({ x: 0, y: 0 }, { x: 5000, y: 0 });
    const t = f.type('Zdivo 300');
    expect(fails(f, 'wallType.delete', { typeId: t })).toMatch(/1 stěn/);
    f.run('wallType.delete', { typeId: t, replacementId: f.type('Příčka 125') });
    expect(f.wall(id).typeId).toBe(f.type('Příčka 125'));
    expect(f.model.wallTypes[t]).toBeUndefined();
    f.editor.undo();
    expect(f.wall(id).typeId).toBe(t);
  });

  it('vyčistit nepoužité nechá jen použité typy; načtení z knihovny vrátí kopii s odkazem', () => {
    const f = fixture();
    f.line({ x: 0, y: 0 }, { x: 5000, y: 0 });
    f.run('wallType.purgeUnused', {});
    expect(Object.values(f.model.wallTypes).map((t) => t.name)).toEqual(['Zdivo 300']);
    const [id] = f.run('wallType.load', { key: 'drywall-100' });
    expect(f.model.wallTypes[id!]!.source?.itemId).toBe('drywall-100');
    expect(fails(f, 'wallType.load', { key: 'drywall-100' })).toMatch(/už v projektu/);
  });

  it('líc jádra jde zvolit jen u typu s jádrem; typ bez jádra ho přepne na líc', () => {
    const f = fixture();
    const id = f.line(
      { x: 0, y: 0 },
      { x: 5000, y: 0 },
      { typeId: threeLayers(f), referenceLine: 'core-face' },
    );
    const layer = { materialId: mat(f, 'Minerální vata'), thickness: 100, function: 'insulation' };
    const [noCore] = f.run('wallType.create', { name: 'Bez jádra', layers: [layer] });
    f.run('wall.setType', { wallIds: [id], typeId: noCore });
    expect(f.wall(id).referenceLine).toBe('face');
    expect(fails(f, 'wall.setReferenceLine', { wallId: id, referenceLine: 'core-face' })).toMatch(
      /nemá jádro/,
    );
  });

  it('typ přežije uložení a načtení projektu (verze 3)', () => {
    const f = fixture();
    const r = parseProject(serializeProject(f.model));
    expect(r.ok && r.model.wallTypes).toEqual(f.model.wallTypes);
  });
});

describe('plán stěn Z1 / kresba: Studie vs. Projekt', () => {
  const kinds = (f: Fixture) => drawView(f.model, f.viewId).primitives.map((p: Primitive) => p.kind);

  it('Projekt (střední) kreslí tři vrstvy se šrafami a čáry mezi nimi, Studie (hrubá) jednu výplň', () => {
    const f = fixture();
    f.line({ x: 0, y: 0 }, { x: 5000, y: 0 }, { typeId: threeLayers(f) });
    const study = kinds(f);
    expect(study.filter((k) => k === 'hatch')).toHaveLength(0);
    expect(study.filter((k) => k === 'fill')).toHaveLength(1);
    f.run('view.setStyle', { viewId: f.viewId, styleId: f.style('Projekt') });
    const prims = drawView(f.model, f.viewId).primitives;
    expect(prims.filter((p) => p.kind === 'hatch')).toHaveLength(3);
    const boundaries = prims.filter((p) => p.kind === 'line' && p.source?.role === 'hranice vrstvy');
    expect(boundaries).toHaveLength(2);
  });
});
