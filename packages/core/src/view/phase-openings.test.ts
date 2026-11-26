import { describe, expect, it } from 'vitest';
import { vec } from '../geometry/index.ts';
import { fixture, type Fixture } from '../testing/fixture.ts';
import { drawView } from './draw-view.ts';

const phase = (f: Fixture, name: string) =>
  Object.values(f.model.display.overrideCombinations).find((c) => c.phase && c.name === name)!.id;
/** Počet uzavřených obrysů stěny: 1 = celá, 2 = přerušená otvorem. */
const outlines = (f: Fixture, wallId: string) =>
  drawView(f.model, f.viewId).primitives.filter(
    (p) => p.kind === 'line' && p.closed && p.source?.elementId === wallId && p.source.role === 'obrys',
  ).length;

function wallWithOpening(status: 'new' | 'demolished') {
  const f = fixture();
  const w = f.line(vec(0, 0), vec(6000, 0));
  f.run('wall.setProperties', { wallIds: [w], status: 'existing' });
  f.run('opening.create', { wallId: w, offset: 2000, width: 1000, height: 2100, sill: 0, status });
  return { f, w };
}

describe('plan-steny / Z10: probourání a zazdívka jako otvor se stavem', () => {
  it('probourání (nový otvor ve stávající stěně): ve stávajícím stavu stěna celá, v novém stavu otvor', () => {
    const { f, w } = wallWithOpening('new');
    f.run('view.setPhaseFilter', { viewId: f.viewId, filterId: phase(f, 'Fáze – stávající stav') });
    expect(outlines(f, w)).toBe(1);
    f.run('view.setPhaseFilter', { viewId: f.viewId, filterId: phase(f, 'Fáze – nový stav') });
    expect(outlines(f, w)).toBe(2);
  });

  it('zazdívka (bouraný otvor): ve stávajícím stavu otvor, v plánovaném stavu stěna celá', () => {
    const { f, w } = wallWithOpening('demolished');
    f.run('view.setPhaseFilter', { viewId: f.viewId, filterId: phase(f, 'Fáze – stávající stav') });
    expect(outlines(f, w)).toBe(2);
    f.run('view.setPhaseFilter', { viewId: f.viewId, filterId: phase(f, 'Fáze – plánovaný stav') });
    expect(outlines(f, w)).toBe(1);
  });
});
