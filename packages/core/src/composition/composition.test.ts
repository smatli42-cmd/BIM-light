import { describe, expect, it } from 'vitest';
import { vec } from '../geometry/index.ts';
import { SCHEMA_VERSION } from '../model/types.ts';
import { parseProject, serializeProject } from '../persistence/project-file.ts';
import { fixture, type Fixture } from '../testing/fixture.ts';
import { bandThickness } from '../wall/layers.ts';
import { sameLayers } from './store.ts';

const comp = (f: Fixture, typeName: string) => {
  const t = f.model.wallTypes[f.type(typeName)]!;
  return f.model.compositions[t.bands[0]!.compositionId!]!;
};
const thickness = (f: Fixture, typeName: string) =>
  bandThickness(f.model.wallTypes[f.type(typeName)]!.bands[0]!);

/** Invariant: každý pás odkazuje na existující skladbu a jeho vrstvy jsou její kopie. */
function consistent(f: Fixture) {
  for (const t of Object.values(f.model.wallTypes))
    for (const b of t.bands) {
      const c = b.compositionId ? f.model.compositions[b.compositionId] : undefined;
      expect(c, `${t.name} bez skladby`).toBeTruthy();
      expect(sameLayers(c!.layers, b.layers)).toBe(true);
    }
}

describe('koncepce rozhraní 11a: skladby společné pro stěny, desky a střechy', () => {
  it('nový projekt: každý typ stěny má skladbu pro stěnu se stejným názvem', () => {
    const f = fixture();
    consistent(f);
    const c = comp(f, 'Obvodová zateplená 465');
    expect(c.name).toBe('Obvodová zateplená 465');
    expect(c.use).toEqual({ wall: true, slab: false, roof: false });
  });

  it('sdílená skladba: úprava vrstvy u jednoho typu změní i druhý typ a jeho stěny', () => {
    const f = fixture();
    const w = f.line(vec(0, 0), vec(4000, 0), { typeId: f.type('Zdivo 300') });
    f.run('wallType.setComposition', {
      typeId: f.type('Zdivo 300'),
      compositionId: comp(f, 'Obvodová zateplená 465').id,
    });
    expect(thickness(f, 'Zdivo 300')).toBe(465);
    f.run('wallType.updateLayer', {
      typeId: f.type('Obvodová zateplená 465'),
      layerIndex: 2,
      thickness: 200,
    });
    expect(thickness(f, 'Zdivo 300')).toBe(515);
    expect(bandThickness(f.model.wallTypes[f.wall(w).typeId]!.bands[0]!)).toBe(515);
    consistent(f);
  });

  it('duplikát typu dostane vlastní kopii skladby – úprava kopie původní typ nezmění', () => {
    const f = fixture();
    const [copy] = f.run('wallType.duplicate', { typeId: f.type('Zdivo 300') });
    f.run('wallType.updateLayer', { typeId: copy, layerIndex: 0, thickness: 250 });
    expect(thickness(f, 'Zdivo 300')).toBe(300);
    expect(f.model.wallTypes[copy as string]!.bands[0]!.compositionId).not.toBe(comp(f, 'Zdivo 300').id);
    consistent(f);
  });

  it('jiná tloušťka stěny = nový typ s novou skladbou; původní skladba zůstane', () => {
    const f = fixture();
    const w = f.line(vec(0, 0), vec(4000, 0), { typeId: f.type('Zdivo 300') });
    f.run('wall.setThickness', { wallId: w, thickness: 450 });
    expect(thickness(f, 'Zdivo 300')).toBe(300);
    expect(f.model.wallTypes[f.wall(w).typeId]!.bands[0]!.compositionId).not.toBe(comp(f, 'Zdivo 300').id);
    consistent(f);
  });

  it('smazání materiálu s náhradou změní i skladby', () => {
    const f = fixture();
    const eps = comp(f, 'Obvodová zateplená 465').layers[2]!.materialId;
    const other = Object.values(f.model.materials).find((m) => m.id !== eps)!.id;
    f.run('material.delete', { materialId: eps, replacementId: other });
    for (const c of Object.values(f.model.compositions))
      expect(c.layers.map((l) => l.materialId)).not.toContain(eps);
    consistent(f);
  });

  it('příkazy skladby: přejmenovat, Použít pro, smazat jen nepoužitou', () => {
    const f = fixture();
    const c = comp(f, 'Zdivo 300');
    f.run('composition.rename', { compositionId: c.id, name: 'Zdivo keramické 300' });
    f.run('composition.setUse', { compositionId: c.id, slab: true });
    expect(f.model.compositions[c.id]).toMatchObject({ name: 'Zdivo keramické 300', use: { slab: true } });
    expect(() => f.run('composition.setUse', { compositionId: c.id, wall: false })).toThrow(/stěnu/);
    expect(() => f.run('composition.delete', { compositionId: c.id })).toThrow(/Zdivo 300/);
    f.run('wallType.setComposition', {
      typeId: f.type('Zdivo 300'),
      compositionId: comp(f, 'Příčka 125').id,
    });
    f.run('composition.delete', { compositionId: c.id });
    expect(f.model.compositions[c.id]).toBeUndefined();
  });

  it('dotaz composition.list: tloušťka, vrstvy s názvem materiálu a typy, které skladbu sdílejí', () => {
    const f = fixture();
    const r = f.editor.query('composition.list', {});
    const rows = r.ok ? (r.data as { name: string; thickness: number; wallTypes: unknown[] }[]) : [];
    const row = rows.find((x) => x.name === 'Obvodová zateplená 465');
    expect(row?.thickness).toBe(465);
    expect(row?.wallTypes).toHaveLength(1);
  });
});

describe('základ 9 / koncepce rozhraní 11a: migrace projektu 15 → 16', () => {
  it('pásy dostanou skladby; typy se stejnými vrstvami jednu společnou', () => {
    const f = fixture();
    f.run('wallType.duplicate', { typeId: f.type('Zdivo 300') });
    const old = JSON.parse(serializeProject(f.model)) as Record<string, unknown>;
    delete old.compositions;
    for (const t of Object.values(old.wallTypes as Record<string, { bands: { compositionId?: string }[] }>))
      for (const b of t.bands) delete b.compositionId;
    const r = parseProject(JSON.stringify({ ...old, schemaVersion: 15 }));
    expect(r.ok && r.model.schemaVersion).toBe(SCHEMA_VERSION);
    if (!r.ok) return;
    const ids = Object.values(r.model.wallTypes)
      .filter((t) => t.name.startsWith('Zdivo 300'))
      .map((t) => t.bands[0]!.compositionId);
    expect(ids).toHaveLength(2);
    expect(ids[0]).toBe(ids[1]);
    expect(Object.keys(r.model.compositions)).toHaveLength(Object.keys(r.model.wallTypes).length - 1);
  });
});
