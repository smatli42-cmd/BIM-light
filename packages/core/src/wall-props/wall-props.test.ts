import { describe, expect, it } from 'vitest';
import { vec } from '../geometry/index.ts';
import { SCHEMA_VERSION } from '../model/types.ts';
import { parseProject, serializeProject } from '../persistence/project-file.ts';
import { fixture } from '../testing/fixture.ts';
import { drawView } from '../view/draw-view.ts';
import { WALL_PROPERTY_PARAMS } from './params.ts';
import { wallProperties } from './resolve.ts';

const query = (f: ReturnType<typeof fixture>, wallIds: string[]) => {
  const r = f.editor.query('wall.properties', { wallIds });
  if (!r.ok) throw new Error(r.error.message);
  return r.data as { properties: Record<string, unknown>; overridden: string[]; ifcPredefinedType: string }[];
};

describe('plan-steny / Z7: vlastnosti stěny (typ + přepis instance)', () => {
  it('plan-steny / Z7: knihovní typy mají výchozí funkci, nosnost a polohu', () => {
    const f = fixture();
    const ext = f.line(vec(0, 0), vec(4000, 0), { typeId: f.type('Obvodová zateplená 465') });
    const part = f.line(vec(0, 3000), vec(4000, 3000), { typeId: f.type('Příčka 125') });
    expect(wallProperties(f.model, f.wall(ext))).toMatchObject({
      function: 'exterior',
      loadBearing: true,
      isExternal: true,
    });
    expect(wallProperties(f.model, f.wall(part))).toMatchObject({
      function: 'partition',
      loadBearing: false,
      isExternal: false,
    });
  });

  it('plan-steny / Z7: vlastnost typu platí pro všechny stěny typu, přepis jen pro jednu; null vrátí typ', () => {
    const f = fixture();
    const a = f.line(vec(0, 0), vec(4000, 0));
    const b = f.line(vec(0, 3000), vec(4000, 3000));
    f.run('wallType.setProperties', { typeId: f.type('Zdivo 300'), properties: { fireRating: 'REI 90' } });
    f.run('wall.setProperties', { wallIds: [b], properties: { loadBearing: false, fireRating: 'EI 30' } });
    const [qa, qb] = query(f, [a, b]);
    expect(qa?.properties).toMatchObject({ fireRating: 'REI 90', loadBearing: true });
    expect(qa?.overridden).toEqual([]);
    expect(qb?.properties).toMatchObject({ fireRating: 'EI 30', loadBearing: false });
    expect(qb?.overridden.sort()).toEqual(['fireRating', 'loadBearing']);
    f.run('wall.setProperties', { wallIds: [b], properties: { fireRating: null, loadBearing: null } });
    expect(f.wall(b).properties).toBeUndefined();
    expect(query(f, [b])[0]?.properties.fireRating).toBe('REI 90');
  });

  it('plan-steny / Z7: každá změna je jeden krok Zpět', () => {
    const f = fixture();
    const a = f.line(vec(0, 0), vec(4000, 0));
    f.run('wall.setProperties', { wallIds: [a], properties: { function: 'foundation' } });
    expect(query(f, [a])[0]?.ifcPredefinedType).toBe('USERDEFINED');
    f.editor.undo();
    expect(wallProperties(f.model, f.wall(a)).function).toBe('interior');
  });

  it('plan-steny / Z7: neplatná hodnota neprojde kontrolou parametrů', () => {
    const f = fixture();
    const a = f.line(vec(0, 0), vec(4000, 0));
    const r = f.editor.execute('wall.setProperties', { wallIds: [a], properties: { function: 'roof' } });
    expect(r.ok).toBe(false);
    const t = f.editor.execute('wallType.setProperties', {
      typeId: f.type('Zdivo 300'),
      properties: { color: 'red' },
    });
    expect(t.ok).toBe(false);
  });

  it('plan-steny / Z7: nová tloušťka (nový typ) převezme vlastnosti původního typu', () => {
    const f = fixture();
    const a = f.line(vec(0, 0), vec(4000, 0), { typeId: f.type('Obvodová zateplená 465') });
    f.run('wall.setThickness', { wallId: a, thickness: 515 });
    expect(f.model.wallTypes[f.wall(a).typeId]?.name).not.toBe('Obvodová zateplená 465');
    expect(wallProperties(f.model, f.wall(a)).isExternal).toBe(true);
  });

  it('základ 15b: popis parametrů má popisek, skupinu a schéma; IFC jen u Pset_WallCommon vlastností', () => {
    for (const p of WALL_PROPERTY_PARAMS) {
      expect(p.label && p.group && p.schema.type).toBeTruthy();
      if (p.key !== 'function') expect(p.ifc?.name).toBeTruthy();
    }
  });
});

describe('plan-steny / Z7: konstrukční zobrazení „jen jádro nosných“', () => {
  it('nenosná příčka zmizí, nosná stěna má jen jádro', () => {
    const f = fixture();
    const ext = f.line(vec(0, 0), vec(4000, 0), { typeId: f.type('Obvodová zateplená 465') });
    const part = f.line(vec(0, 3000), vec(4000, 3000), { typeId: f.type('Příčka 100') });
    f.run('view.setDetail', { viewId: f.viewId, detail: 'medium' });
    const prims = drawView(f.model, f.viewId, { structure: 'bearing-core' }).primitives;
    expect(prims.some((p) => p.source?.elementId === part)).toBe(false);
    const own = prims.filter((p) => p.source?.elementId === ext);
    expect(own.length).toBeGreaterThan(0);
    expect(own.map((p) => p.source?.role)).not.toContain('hranice vrstvy');
  });

  it('otvor v nenosné příčce se nekreslí, v nosné stěně ano', () => {
    const f = fixture();
    const ext = f.line(vec(0, 0), vec(4000, 0), { typeId: f.type('Obvodová zateplená 465') });
    const part = f.line(vec(0, 3000), vec(4000, 3000), { typeId: f.type('Příčka 100') });
    const [o1] = f.run('opening.create', { wallId: ext, offset: 1000, width: 900, sill: 2500, height: 300 });
    const [o2] = f.run('opening.create', { wallId: part, offset: 1000, width: 900, sill: 2500, height: 300 });
    const ids = drawView(f.model, f.viewId, { structure: 'bearing-core' }).primitives.map(
      (p) => p.source?.elementId,
    );
    expect(ids).toContain(o1);
    expect(ids).not.toContain(o2);
  });
});

describe('základ 9 / plan-steny Z7: migrace projektu 12 → 13', () => {
  it('typy dostanou vlastnosti podle knihovny, vlastní typ obecné výchozí', () => {
    const f = fixture();
    f.run('wallType.create', {
      name: 'Vlastní',
      layers: [{ materialId: Object.keys(f.model.materials)[0], thickness: 200, function: 'core' }],
    });
    const old = JSON.parse(serializeProject(f.model)) as {
      wallTypes: Record<string, Record<string, unknown>>;
    };
    for (const t of Object.values(old.wallTypes)) delete t.properties;
    const r = parseProject(JSON.stringify({ ...old, schemaVersion: 12 }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.model.schemaVersion).toBe(SCHEMA_VERSION);
    const byName = (n: string) => Object.values(r.model.wallTypes).find((t) => t.name === n)?.properties;
    expect(byName('Obvodová zateplená 465')).toMatchObject({ function: 'exterior', isExternal: true });
    expect(byName('Vlastní')).toMatchObject({ function: 'interior', loadBearing: false });
  });
});
