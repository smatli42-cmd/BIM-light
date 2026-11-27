import { describe, expect, it } from 'vitest';
import { vec, type View } from '@bim-light/core';
import { fixture, type Fixture } from '../../../../packages/core/src/testing/fixture.ts';
import { modelSolids } from './scene-model.ts';
import { shapeArea } from './slice.ts';
import type { Solid } from './solids.ts';

const view = (f: Fixture): View => f.model.views[f.viewId] as View;
const phase = (f: Fixture, name: string) =>
  Object.values(f.model.display.overrideCombinations).find((c) => c.name === name)!.id;
const volume = (solids: readonly Solid[]) =>
  solids.reduce((v, s) => v + s.slabs.reduce((a, b) => a + shapeArea(b.shape) * (b.z1 - b.z0), 0), 0);
const YELLOW = '#fff3b0';

/** Stávající stěna 300 s novým otvorem 1000 × 2000 (probourání). */
function probourani() {
  const f = fixture();
  const id = f.line(vec(0, 0), vec(5000, 0), { status: 'existing' });
  const full = volume(modelSolids(f.model, view(f)));
  f.run('opening.create', { wallId: id, offset: 1000, width: 1000, height: 2000, sill: 0, status: 'new' });
  return { f, id, full };
}

describe('plán stěn Z10 / 3D náhled: rekonstrukce u otvorů (probourání, zazdívka)', () => {
  it('plán stěn Z10 / 3D: v bouracích pracích je probourání žlutý blok ve stávající stěně', () => {
    const { f, id, full } = probourani();
    f.run('view.setPhaseFilter', { viewId: f.viewId, filterId: phase(f, 'Fáze – bourací práce') });
    const solids = modelSolids(f.model, view(f)).filter((s) => s.elementId === id);
    const patch = solids.filter((s) => s.color === YELLOW);
    expect(volume(patch)).toBeCloseTo(1000 * 2000 * 300, -3);
    // Stěna má v místě probourání díru a záplata ji přesně vyplní: celkový objem je jako bez otvoru.
    expect(volume(solids)).toBeCloseTo(full, -3);
  });

  it('plán stěn Z10 / 3D: v plánovaném stavu je probourání otvor, žádná záplata', () => {
    const { f, id, full } = probourani();
    f.run('view.setPhaseFilter', { viewId: f.viewId, filterId: phase(f, 'Fáze – plánovaný stav') });
    const solids = modelSolids(f.model, view(f)).filter((s) => s.elementId === id);
    expect(solids.some((s) => s.color === YELLOW)).toBe(false);
    expect(full - volume(solids)).toBeCloseTo(1000 * 2000 * 300, -3);
  });

  it('plán stěn Z10 / 3D: ve stávajícím stavu probourání není (stěna celá, bez záplaty)', () => {
    const { f, id, full } = probourani();
    f.run('view.setPhaseFilter', { viewId: f.viewId, filterId: phase(f, 'Fáze – stávající stav') });
    const solids = modelSolids(f.model, view(f)).filter((s) => s.elementId === id);
    expect(solids.some((s) => s.color === YELLOW)).toBe(false);
    expect(volume(solids)).toBeCloseTo(full, -3);
  });
});
