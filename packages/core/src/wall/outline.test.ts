import { describe, expect, it } from 'vitest';
import { drawView } from '../view/draw-view.ts';
import { fixture, room } from '../testing/fixture.ts';
import { wallGeometry } from './geometry.ts';
import { outlineRuns } from './outline.ts';

describe('závada: zkosené napojení stěn není vidět', () => {
  it('volná stěna má jeden uzavřený obrys včetně čel', () => {
    const f = fixture();
    const id = f.line({ x: 0, y: 0 }, { x: 5000, y: 0 });
    const runs = outlineRuns(wallGeometry(f.model, f.wall(id)));
    expect(runs).toHaveLength(1);
    expect(runs[0]?.closed).toBe(true);
  });

  it('stěny místnosti (rohy oba konce) kreslí jen líce, bez čáry pokosu', () => {
    const f = fixture();
    const ids = room(f);
    for (const id of ids) {
      const runs = outlineRuns(wallGeometry(f.model, f.wall(id)));
      expect(runs).toHaveLength(2);
      expect(runs.every((r) => !r.closed && r.points.length === 2)).toBe(true);
    }
    const outlines = drawView(f.model, f.viewId).primitives.filter((p) => p.source.role === 'obrys');
    expect(outlines).toHaveLength(8);
  });

  it('stěna s jedním volným koncem: otevřený obrys s čelem jen na volném konci', () => {
    const f = fixture();
    const a = f.line({ x: 0, y: 0 }, { x: 4000, y: 0 });
    f.line(
      { x: 4000, y: 0 },
      { x: 4000, y: 3000 },
      { connections: [{ end: 'start', wallId: a, at: 'ATEND' }] },
    );
    const runs = outlineRuns(wallGeometry(f.model, f.wall(a)));
    expect(runs).toHaveLength(1);
    expect(runs[0]?.closed).toBe(false);
    expect(runs[0]?.points).toHaveLength(4);
  });
});
