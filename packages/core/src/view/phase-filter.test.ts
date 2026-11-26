import { describe, expect, it } from 'vitest';
import { vec } from '../geometry/index.ts';
import { parseProject, serializeProject } from '../persistence/project-file.ts';
import { fixture, type Fixture } from '../testing/fixture.ts';
import { drawView } from './draw-view.ts';

const phase = (f: Fixture, name: string) =>
  Object.values(f.model.display.overrideCombinations).find((c) => c.phase && c.name === name)!.id;
const combo = (f: Fixture, name: string) =>
  Object.values(f.model.display.overrideCombinations).find((c) => c.name === name)!.id;
const drawn = (f: Fixture, id: string) =>
  drawView(f.model, f.viewId).primitives.filter((p) => p.source?.elementId === id);

/** Čtyři stávající stěny, bouraná příčka a nová příčka (příklad uživatele 2026-11-26). */
function renovation() {
  const f = fixture();
  const walls = [
    f.line(vec(0, 0), vec(0, 4000)),
    f.line(vec(0, 4000), vec(6000, 4000)),
    f.line(vec(6000, 4000), vec(6000, 0)),
    f.line(vec(6000, 0), vec(0, 0)),
  ];
  const old = f.line(vec(3000, 0), vec(3000, 4000));
  const neu = f.line(vec(1000, 1500), vec(2500, 1500));
  f.run('wall.setProperties', { wallIds: [...walls, old], status: 'existing' });
  f.run('wall.setProperties', { wallIds: [old], status: 'demolished' });
  return { f, walls, old, neu };
}

describe('pokyn uživatele 2026-11-26: filtr rekonstrukce pohledu (vzor Arditu / Archicadu)', () => {
  it('Bourací práce: stávající stěny, bouraná příčka čárkovaně, nová příčka skrytá', () => {
    const { f, walls, old, neu } = renovation();
    f.run('view.setPhaseFilter', { viewId: f.viewId, filterId: phase(f, 'Fáze – bourací práce') });
    expect(drawn(f, walls[0]!).length).toBeGreaterThan(0);
    expect(drawn(f, old).some((p) => p.kind === 'line' && p.stroke.lineType === 'dashed')).toBe(true);
    expect(drawn(f, neu)).toEqual([]);
  });

  it('Plánovaný stav skryje bouranou; Nový stav ji skryje a novou zvýrazní; Vše ukáže všechno', () => {
    const { f, old, neu } = renovation();
    f.run('view.setPhaseFilter', { viewId: f.viewId, filterId: phase(f, 'Fáze – plánovaný stav') });
    expect(drawn(f, old)).toEqual([]);
    const plain = drawn(f, neu).find((p) => p.kind === 'line');
    f.run('view.setPhaseFilter', { viewId: f.viewId, filterId: phase(f, 'Fáze – nový stav') });
    const red = drawn(f, neu).find((p) => p.kind === 'line');
    expect(plain?.kind === 'line' && red?.kind === 'line' && plain.stroke.color !== red.stroke.color).toBe(
      true,
    );
    f.run('view.setPhaseFilter', { viewId: f.viewId, filterId: null });
    expect(drawn(f, old).length).toBeGreaterThan(0);
  });

  it('filtr platí vedle grafických přepisů: přepis zůstane vybraný', () => {
    const { f, neu } = renovation();
    const other = combo(f, 'Bez přepisů');
    f.run('view.setOverrideCombination', { viewId: f.viewId, combinationId: other });
    f.run('view.setPhaseFilter', { viewId: f.viewId, filterId: phase(f, 'Fáze – stávající stav') });
    expect(f.model.views[f.viewId]?.local.overrideCombinationId).toBe(other);
    expect(drawn(f, neu)).toEqual([]);
  });

  it('základ 9: starý projekt (fáze v přepisech) se převede na filtr rekonstrukce', () => {
    const { f, neu } = renovation();
    type Obj = Record<string, unknown>;
    const raw = JSON.parse(serializeProject(f.model)) as Obj & { display: Obj; views: Record<string, Obj> };
    const all = raw.display['overrideCombinations'] as Record<string, Obj>;
    const keep = Object.entries(all).filter(([, c]) => !(c['name'] === 'Fáze – nový stav'));
    const combos = Object.fromEntries(
      keep.map(([k, c]) => {
        const { phase: _p, ...rest } = c;
        return [k, rest['name'] === 'Fáze – plánovaný stav' ? { ...rest, name: 'Fáze – nový stav' } : rest];
      }),
    );
    const existing = Object.values(combos).find((c) => c['name'] === 'Fáze – stávající stav')?.['id'];
    const { phaseFilterId: _f, ...view } = raw.views[f.viewId] as Obj;
    raw.views[f.viewId] = { ...view, local: { overrideCombinationId: existing } };
    raw.display = { ...raw.display, overrideCombinations: combos };
    const old = { ...raw, schemaVersion: 11, display: { ...raw.display, schemaVersion: 4 } };
    const r = parseProject(JSON.stringify(old));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.model.views[f.viewId]?.phaseFilterId).toBe(existing);
    expect(r.model.views[f.viewId]?.local.overrideCombinationId).toBeUndefined();
    const names = Object.values(r.model.display.overrideCombinations)
      .filter((c) => c.phase)
      .map((c) => c.name);
    expect(names).toEqual(expect.arrayContaining(['Fáze – plánovaný stav', 'Fáze – nový stav']));
    expect(drawView(r.model, f.viewId).primitives.some((p) => p.source?.elementId === neu)).toBe(false);
  });

  it('pokyn uživatele 2026-11-26: příčka označená k bourání až po napojení – plánovaný stav bez mezery', () => {
    const f = fixture();
    const old = f.line(vec(3000, 0), vec(3000, 4000));
    f.run('wall.setProperties', { wallIds: [old], status: 'existing' });
    const [neu] = f.run('wall.create', {
      storeyId: f.storeyId,
      typeId: f.type('Zdivo 300'),
      path: { kind: 'line', start: vec(0, 2000), end: vec(6000, 2000) },
      autoConnect: true,
    });
    expect(Object.values(f.model.relations).some((r) => r.kind === 'wall-connection')).toBe(true);
    f.run('wall.setProperties', { wallIds: [old], status: 'demolished' });
    f.run('view.setPhaseFilter', { viewId: f.viewId, filterId: phase(f, 'Fáze – plánovaný stav') });
    const fills = drawn(f, neu!).filter((p) => p.source?.role === 'výplň');
    expect(fills.length).toBe(1);
  });

  it('skrytá stěna fáze se v kresbě nenapojuje: stávající příčka napojená křížem na novou zůstane celá', () => {
    const f = fixture();
    const old = f.line(vec(3000, 0), vec(3000, 4000));
    f.run('wall.setProperties', { wallIds: [old], status: 'existing' });
    f.run('wall.create', {
      storeyId: f.storeyId,
      typeId: f.type('Zdivo 300'),
      path: { kind: 'line', start: vec(0, 2000), end: vec(6000, 2000) },
      autoConnect: true,
    });
    f.run('view.setPhaseFilter', { viewId: f.viewId, filterId: phase(f, 'Fáze – stávající stav') });
    expect(drawn(f, old).filter((p) => p.source?.role === 'výplň').length).toBe(1);
  });

  it('pokyn uživatele 2026-11-26: nová stěna se při kreslení nenapojí na bouranou (ani křížem, ani v T)', () => {
    const f = fixture();
    const old = f.line(vec(3000, 0), vec(3000, 4000));
    f.run('wall.setProperties', { wallIds: [old], status: 'demolished' });
    f.run('wall.create', {
      storeyId: f.storeyId,
      typeId: f.type('Zdivo 300'),
      path: { kind: 'line', start: vec(0, 2000), end: vec(6000, 2000) },
      autoConnect: true,
    });
    f.run('wall.create', {
      storeyId: f.storeyId,
      typeId: f.type('Zdivo 300'),
      path: { kind: 'line', start: vec(0, 3000), end: vec(3000, 3000) },
      autoConnect: true,
    });
    expect(Object.values(f.model.relations).filter((r) => r.kind === 'wall-connection')).toEqual([]);
  });
});
