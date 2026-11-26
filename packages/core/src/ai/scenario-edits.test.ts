// Scénář „AI kreslí dům“, část pohodlí úprav (plán stěn Z9): pipeta, výběr stejných, rozdělit s mezerou.
// Jen JSON volání nástrojů – stejné kroky, jaké dělá uživatel v info boxu.
import { describe, expect, it } from 'vitest';
import { room, row, start } from './scenario-helpers.ts';
import type { WallRow } from './scenario-helpers.ts';

describe('AI scénář: pohodlí úprav (plán stěn Z9)', () => {
  it('přenést vlastnosti, najít stejné stěny a rozdělit s mezerou', () => {
    const c = start();
    const [left, top, right] = room(c);
    const types = c.ai.call<{ id: string; name: string }[]>('wallType.list');
    const rc = types.find((t) => t.name === 'ŽB stěna 200')!.id;
    c.ai.call('wall.setType', { wallIds: [left], typeId: rc });
    c.ai.call('wall.matchProperties', { sourceWallId: left, wallIds: [right] });
    expect(row(c.ai.call<WallRow[]>('wall.list'), right!).thickness).toBe(200);
    const same = c.ai.call<string[]>('wall.findSame', { wallId: left });
    expect([...same].sort()).toEqual([left, right].sort());
    const before = c.ai.call<WallRow[]>('wall.list').length;
    const t = row(c.ai.call<WallRow[]>('wall.list'), top!);
    expect(t).toBeTruthy();
    const w = c.ai.call<{ path: { start: { x: number; y: number }; end: { x: number; y: number } } }>(
      'wall.get',
      { wallId: top },
    );
    const mid = { x: (w.path.start.x + w.path.end.x) / 2, y: (w.path.start.y + w.path.end.y) / 2 };
    c.ai.call('wall.split', { wallId: top, point: mid, gap: 200 });
    expect(c.ai.call<WallRow[]>('wall.list')).toHaveLength(before + 1);
  });
});
