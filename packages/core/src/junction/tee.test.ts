import { describe, expect, it } from 'vitest';
import { vec } from '../geometry/index.ts';
import { fixture } from '../testing/fixture.ts';
import { layersArea, outlineArea, ownerAt, totalArea, wallAt } from '../testing/junction.ts';
import { drawView } from '../view/draw-view.ts';
import { allWallGeometry } from '../wall/geometry.ts';

/**
 * Hostitel „Obvodová zateplená 465“ vodorovně: omítka y 0..15, zdivo 15..315, EPS 315..465.
 * Napojená stěna zdola (y < 0) nebo shora (zvenku), konec na hostiteli (T).
 */
function tee(type = 'Zdivo 300', fromOutside = false) {
  const f = fixture();
  const host = f.line(vec(0, 0), vec(6000, 0), { typeId: f.type('Obvodová zateplená 465') });
  const y = fromOutside ? 3000 : -3000;
  const t = f.line(vec(3000, y), vec(3000, fromOutside ? 465 : 0), {
    typeId: f.type(type),
    connections: [{ end: 'end', wallId: host, at: 'ATPATH' }],
  });
  return { f, host, t };
}

describe('plan-steny / Z2: T napojení po vrstvách', () => {
  it('rozhodnutí 5: jádro napojené stěny projde omítkou hostitele až k jeho jádru (jádro na jádro)', () => {
    const { f, t } = tee();
    const g = allWallGeometry(f.model, f.storeyId).get(t)!;
    expect(g.faces.ref.end.y).toBeCloseTo(15, 6);
    expect(g.faces.opp.end.y).toBeCloseTo(15, 6);
    expect(wallAt(f, vec(2850, 7))).toBe(t);
    expect(ownerAt(f, vec(2850, 100))).toBe('Zdivo keramické');
    expect(wallAt(f, vec(2850, 100))).not.toBe(t);
  });

  it('jádro hostitele se nikdy neprořízne: zvenku končí napojená stěna na líci jádra, izolace se přeruší', () => {
    const { f, host, t } = tee('Zdivo 300', true);
    const g = allWallGeometry(f.model, f.storeyId).get(t)!;
    expect(g.faces.ref.end.y).toBeCloseTo(315, 6);
    expect(wallAt(f, vec(3150, 400))).toBe(t);
    expect(wallAt(f, vec(2000, 400))).toBe(host);
  });

  it('omítka napojené stěny končí na omítce hostitele, omítka hostitele obteče roh k jádru napojené stěny', () => {
    const { f, host, t } = tee('Příčka 100');
    // Příčka 100: omítka 10 + zdivo 80 + omítka 10, líce x 2900..3000 (tloušťka doleva = −x).
    expect(ownerAt(f, vec(2905, -5))).toBe('Omítka');
    expect(wallAt(f, vec(2905, -5))).toBe(t);
    expect(wallAt(f, vec(2905, 7))).toBe(host);
    expect(wallAt(f, vec(2950, 7))).toBe(t);
    expect(ownerAt(f, vec(2950, 7))).toBe('Zdivo keramické');
  });

  it('T: plocha vrstev = plocha obrysu, celek bez děr a překryvů', () => {
    const { f } = tee('Příčka 100');
    for (const g of allWallGeometry(f.model, f.storeyId).values())
      expect(layersArea(g)).toBeCloseTo(outlineArea(g), 3);
    expect(totalArea(f)).toBeCloseTo(6000 * 465 + 3000 * 100, 1);
  });

  it('kresba: líc hostitele se v místě T přeruší, hranice omítka / zdivo zůstane', () => {
    const { f } = tee();
    const lines = drawView(f.model, f.viewId).primitives.filter(
      (p) => p.kind === 'line' && p.source.role === 'obrys',
    );
    const crosses = lines.some(
      (p) =>
        p.kind === 'line' &&
        p.points.some((q, i) => {
          const r = p.points[i + 1] ?? (p.closed ? p.points[0] : undefined);
          return (
            !!r &&
            Math.abs(q.y) < 1e-6 &&
            Math.abs(r.y) < 1e-6 &&
            Math.min(q.x, r.x) < 2800 &&
            Math.max(q.x, r.x) > 2900
          );
        }),
    );
    expect(crosses).toBe(false);
    f.run('view.setStyle', { viewId: f.viewId, styleId: f.style('Projekt') });
    const inner = drawView(f.model, f.viewId).primitives.filter(
      (p) =>
        p.kind === 'line' &&
        p.source.role === 'hranice vrstvy' &&
        p.points.some((q) => Math.abs(q.y - 15) < 1e-6),
    );
    expect(inner.length).toBeGreaterThan(0);
  });
});
