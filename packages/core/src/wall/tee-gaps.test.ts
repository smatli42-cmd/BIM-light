import { describe, expect, it } from 'vitest';
import { fixture } from '../testing/fixture.ts';
import { drawView } from '../view/draw-view.ts';
import { allWallGeometry } from './geometry.ts';
import { outlineRuns } from './outline.ts';
import { teeGaps } from './tee-gaps.ts';

/** Hostitel vodorovně (líce y = 0 a 300) a stěna shora napojená v T na líc y = 300 (líce x = 3000 a 3300). */
function scene() {
  const f = fixture();
  const host = f.line({ x: 0, y: 0 }, { x: 6000, y: 0 });
  const tee = f.line(
    { x: 3000, y: 3000 },
    { x: 3000, y: 300 },
    {
      connections: [{ end: 'end', wallId: host, at: 'ATPATH' }],
    },
  );
  return { f, host, tee };
}

describe('otevřené z kroku 3: čára hostitele se v T napojení přeruší', () => {
  it('mezera v líci hostitele je přesně mezi líci napojené stěny', () => {
    const { f, host } = scene();
    const geoms = allWallGeometry(f.model, f.storeyId);
    const gaps = teeGaps(f.model, geoms.get(host)!, geoms);
    expect(gaps.ref).toEqual([]);
    expect(gaps.opp).toHaveLength(1);
    const [a, b] = gaps.opp![0]!;
    expect(a * 6000).toBeCloseTo(3000, 6);
    expect(b * 6000).toBeCloseTo(3300, 6);
  });

  it('obrys hostitele: líc s T je ve dvou kusech, žádná čára nevede přes napojení', () => {
    const { f, host } = scene();
    const geoms = allWallGeometry(f.model, f.storeyId);
    const g = geoms.get(host)!;
    const runs = outlineRuns(g, teeGaps(f.model, g, geoms));
    expect(runs).toHaveLength(1);
    expect(runs[0]?.closed).toBe(false);
    const crossesGap = (runs[0]?.points ?? []).some((p, i, pts) => {
      const q = pts[i + 1];
      return (
        !!q &&
        Math.abs(p.y - 300) < 1e-6 &&
        Math.abs(q.y - 300) < 1e-6 &&
        Math.min(p.x, q.x) < 3200 &&
        Math.max(p.x, q.x) > 3100
      );
    });
    expect(crossesGap).toBe(false);
  });

  it('kresba pohledu: hostitel má obrys bez úseku v místě T', () => {
    const { f, host } = scene();
    const lines = drawView(f.model, f.viewId).primitives.filter(
      (p) => p.kind === 'line' && p.source.role === 'obrys' && p.source.elementId === host,
    );
    expect(lines).toHaveLength(1);
  });
});
