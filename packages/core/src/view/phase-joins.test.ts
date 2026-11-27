import { describe, expect, it } from 'vitest';
import { vec } from '../geometry/index.ts';
import { getWall } from '../wall/queries.ts';
import { fixture, type Fixture } from '../testing/fixture.ts';
import { wallGeometry } from '../wall/geometry.ts';
import { visibleWalls } from './visible-walls.ts';

const phase = (f: Fixture, name: string) =>
  Object.values(f.model.display.overrideCombinations).find((c) => c.phase && c.name === name)!.id;
const joinAt = (f: Fixture, id: string, end: 'start' | 'end') => {
  const m = visibleWalls(f.model, f.model.views[f.viewId]!).model;
  return wallGeometry(m, getWall(m, id)).cuts[end].join;
};

/** Stávající stěna, vybouraný prostřední úsek a do mezery nová stěna (hlášení uživatele 2026-11-26). */
function replaced() {
  const f = fixture();
  const t = f.type('Obvodová zateplená 465');
  const a = f.line(vec(0, 0), vec(9000, 0), { typeId: t });
  f.run('wall.setProperties', { wallIds: [a], status: 'existing' });
  const [mid, b] = f.run('wall.demolishPart', { wallId: a, from: vec(3000, 0), to: vec(6000, 0) });
  const n = f.line(vec(3000, 0), vec(6000, 0), { typeId: t });
  return { f, a, mid: mid!, b: b!, n };
}

describe('hlášení uživatele 2026-11-26: nová stěna místo vybouraného úseku', () => {
  it('plánovaný stav: stávající části a nová stěna se napojí v přímce (bez omítky mezi nimi)', () => {
    const { f, a, b, n } = replaced();
    expect(f.wall(n).status).toBe('new');
    f.run('view.setPhaseFilter', { viewId: f.viewId, filterId: phase(f, 'Fáze – plánovaný stav') });
    expect(joinAt(f, a, 'end')).toBe('straight');
    expect(joinAt(f, n, 'start')).toBe('straight');
    expect(joinAt(f, n, 'end')).toBe('straight');
    expect(joinAt(f, b, 'start')).toBe('straight');
  });

  it('stávající stav: napojení na bouraný úsek zůstane, nová stěna je skrytá', () => {
    const { f, a, mid } = replaced();
    f.run('view.setPhaseFilter', { viewId: f.viewId, filterId: phase(f, 'Fáze – stávající stav') });
    expect(joinAt(f, a, 'end')).toBe('straight');
    expect(joinAt(f, mid, 'start')).toBe('straight');
  });

  it('model se nemění: napojení se doplní jen v kresbě', () => {
    const { f, n } = replaced();
    f.run('view.setPhaseFilter', { viewId: f.viewId, filterId: phase(f, 'Fáze – plánovaný stav') });
    expect(
      Object.values(f.model.relations).some((r) => [r.relating.wallId, r.related.wallId].includes(n)),
    ).toBe(false);
  });
});
