import { describe, expect, it } from 'vitest';
import { parseProject, serializeProject } from '../persistence/project-file.ts';
import { elementFacts } from '../style/conditions.ts';
import { resolveGraphics } from '../style/graphics.ts';
import { categoryState } from '../view/effective.ts';
import { fixture } from '../testing/fixture.ts';

const box = { min: { x: 0, y: 0, z: -500 }, max: { x: 6000, y: 4000, z: 2500 } };
const phase = (f: ReturnType<typeof fixture>, name: string) =>
  Object.values(f.model.display.overrideCombinations).find((c) => c.name === name)!.id;

describe('3D náhled / základ 26: 3D pohled jako data v projektu', () => {
  it('základ 26: nový projekt má výchozí 3D pohled; další jde vytvořit s podlažími a ořezovým kvádrem', () => {
    const f = fixture();
    expect(Object.values(f.model.views3d).map((v) => [v.name, v.storeyIds, v.sectionBox])).toEqual([
      ['3D', null, null],
    ]);
    const [id] = f.run('view3d.create', { name: 'Řez 1.NP', storeyIds: [f.storeyId], sectionBox: box });
    expect(f.model.views3d[id!]).toMatchObject({
      name: 'Řez 1.NP',
      storeyIds: [f.storeyId],
      sectionBox: box,
    });
    f.run('view3d.setSectionBox', { viewId: id, sectionBox: null });
    f.run('view3d.setStoreys', { viewId: id, storeyIds: null });
    f.run('view3d.rename', { viewId: id, name: 'Celek' });
    expect(f.model.views3d[id!]).toMatchObject({ name: 'Celek', storeyIds: null, sectionBox: null });
  });

  it('3D pohled: obrácený kvádr, neznámé podlaží a smazání posledního 3D pohledu příkaz odmítne', () => {
    const f = fixture();
    const [id] = f.run('view3d.create', {});
    const bad = { min: box.max, max: box.min };
    expect(f.editor.execute('view3d.setSectionBox', { viewId: id, sectionBox: bad }).ok).toBe(false);
    expect(f.editor.execute('view3d.setStoreys', { viewId: id, storeyIds: ['nic'] }).ok).toBe(false);
    f.run('view3d.delete', { viewId: id });
    const last = Object.keys(f.model.views3d)[0];
    expect(f.editor.execute('view3d.delete', { viewId: last }).ok).toBe(false);
  });

  it('základ 11: grafika 3D pohledu jde přes stejnou funkci – filtr bourání: žlutě a 50 % průhledně', () => {
    const f = fixture();
    const w = f.line({ x: 0, y: 0 }, { x: 5000, y: 0 }, { status: 'demolished' });
    const id = Object.keys(f.model.views3d)[0]!;
    f.run('view3d.setPhaseFilter', { viewId: id, filterId: phase(f, 'Fáze – bourací práce') });
    const g = resolveGraphics(f.model.display, f.model.views3d[id]!, elementFacts(f.model, f.wall(w)));
    expect([g.effect.surfaceColor, g.effect.surfaceTransparency]).toEqual(['#f2c200', 50]);
    expect(g.why.surfaceTransparency.source).toBe('Bourání žlutě čárkovaně');
    f.run('view3d.setLayerState', { viewId: id, layerId: f.layer('Desky'), visible: false });
    expect(categoryState(f.model.display, f.model.views3d[id]!, 'slab').visible).toBe(false);
  });

  it('základ 9: migrace 20 → 21 – výchozí 3D pohled a průhlednost v grafice', () => {
    const f = fixture();
    const raw = JSON.parse(serializeProject(f.model)) as Record<string, unknown>;
    const display = raw['display'] as Record<string, Record<string, unknown>>;
    const { surfaceTransparency: _t, ...base } = display['baseGraphics']!;
    const rules = Object.fromEntries(
      Object.entries(display['rules']!).map(([k, r]) => {
        const { surfaceTransparency: _x, ...effect } = (r as { effect: Record<string, unknown> }).effect;
        return [k, { ...(r as object), effect }];
      }),
    );
    const { views3d: _v, ...rest } = raw;
    const old = {
      ...rest,
      schemaVersion: 20,
      display: { ...display, schemaVersion: 7, baseGraphics: base, rules },
    };
    const r = parseProject(JSON.stringify(old));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(Object.values(r.model.views3d).map((v) => v.name)).toEqual(['3D']);
    expect(r.model.display.baseGraphics.surfaceTransparency).toBeNull();
    const d = Object.values(r.model.display.rules).find((x) => x.name === 'Bourání žlutě čárkovaně');
    expect(d?.effect.surfaceTransparency).toBe(50);
  });
});
