import { describe, expect, it } from 'vitest';
import { vec } from '../geometry/index.ts';
import { fixture } from '../testing/fixture.ts';
import { drawView } from '../view/draw-view.ts';

describe('oprava 2026-11-26: odkazová čára začíná u líce nejblíž kótovací čáře (ne uprostřed líce)', () => {
  it('kóta celé stěny místnosti: odkazové čáry nevedou přes dům', () => {
    const f = fixture();
    const [, , bottom] = f.run('wall.rectangle', {
      storeyId: f.storeyId,
      typeId: f.type('Obvodová zateplená 465'),
      a: vec(0, 0),
      b: vec(12000, 9000),
    });
    f.run('opening.create', { wallId: bottom, offset: 1500, width: 1500, height: 1500, sill: 900 });
    f.run('dimension.wholeWall', { wallId: bottom, viewId: f.viewId });
    const ext = drawView(f.model, f.viewId).primitives.filter(
      (p) => p.kind === 'line' && p.source?.role === 'odkazová čára',
    );
    expect(ext.length).toBeGreaterThan(0);
    // vnější líc spodní stěny je y = −465; odkazová čára smí začít nejvýš u něj
    for (const p of ext)
      if (p.kind === 'line') for (const q of p.points) expect(q.y).toBeLessThanOrEqual(-465 + 1);
  });
});
