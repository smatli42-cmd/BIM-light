import { describe, expect, it } from 'vitest';
import type { Primitive } from '../drawing/primitives.ts';
import { parseProject, serializeProject } from '../persistence/project-file.ts';
import { elementFacts } from '../style/conditions.ts';
import { resolveGraphics } from '../style/graphics.ts';
import { exportDisplayPackage, parseDisplayPackage } from '../style/package.ts';
import { fixture, type Fixture } from '../testing/fixture.ts';
import { drawView } from '../view/draw-view.ts';
import { displayV1toV2, projectV1toV2 } from './migrate-v1.ts';

const toProject = (f: Fixture) => f.run('view.setStyle', { viewId: f.viewId, styleId: f.style('Projekt') });
const hatches = (f: Fixture) =>
  drawView(f.model, f.viewId).primitives.filter(
    (p): p is Extract<Primitive, { kind: 'hatch' }> => p.kind === 'hatch',
  );

describe('katalog-sraf-materialu / grafika šraf', () => {
  it('sousední stěny téhož materiálu mají společný počátek rastru', () => {
    const f = fixture();
    f.line({ x: 0, y: 0 }, { x: 3000, y: 0 });
    f.line({ x: 3000, y: 0 }, { x: 6000, y: 0 });
    toProject(f);
    const [a, b] = hatches(f);
    expect(a?.origin).toEqual(b?.origin);
    expect(a?.hatch).toBe(b?.hatch);
  });

  it('základ 30: přepis prvku nastaví jinou šrafu a barvu a „proč“ vrátí patro přepisu prvku', () => {
    const f = fixture();
    const id = f.line({ x: 0, y: 0 }, { x: 5000, y: 0 });
    toProject(f);
    const hatch = { hatchId: 'hatch.kamen', pen: 2, lineColor: '#ff0000' };
    f.run('element.setGraphicOverride', { elementIds: [id], effect: { hatch } });
    const h = hatches(f)[0]!;
    expect([h.hatch.id, h.pen, h.lineColor]).toEqual(['hatch.kamen', 2, '#ff0000']);
    const g = resolveGraphics(f.model.display, f.model.views[f.viewId]!, elementFacts(f.model, f.wall(id)));
    expect(g.why.hatch?.level).toBe(5);
  });

  it('základ 9: projekt ve verzi 1 (šrafa vložená v materiálu) se převede na verzi 2', () => {
    const f = fixture();
    const v1 = {
      schemaVersion: 1,
      materials: {
        m1: {
          id: 'm1',
          name: 'Zdivo',
          group: 'zdivo',
          hatch: { patternId: 'masonry', pen: 1, color: '#000000' },
          cutFillColor: '#c9b8a6',
          joinLevelId: null,
        },
      },
      display: {
        schemaVersion: 1,
        rules: { r: { effect: { hatch: { patternId: 'wood', pen: 2, color: '#111111' } } } },
      },
    };
    const v2 = projectV1toV2(v1) as typeof v1 & { display: { hatches: Record<string, unknown> } };
    expect(v2.materials.m1).toMatchObject({
      category: 'Zdivo',
      hatchId: 'hatch.zdivo',
      color: '#c9b8a6',
      hatchPen: 1,
    });
    expect(Object.keys(v2.display.hatches).sort()).toEqual(['hatch.drevo', 'hatch.zdivo']);
    expect(JSON.stringify(v2)).not.toContain('patternId');
    const d = displayV1toV2({ rules: {} });
    expect(d['hatches']).toEqual({});
    expect(parseProject(serializeProject(f.model)).ok).toBe(true);
  });

  it('základ 31: export a import nastavení zobrazení obsahuje šrafy (stejná data po průchodu)', () => {
    const f = fixture();
    const r = parseDisplayPackage(exportDisplayPackage(f.model.display));
    expect(r.ok && r.settings.hatches).toEqual(f.model.display.hatches);
    expect(Object.keys(f.model.display.hatches).length).toBeGreaterThan(5);
  });
});
