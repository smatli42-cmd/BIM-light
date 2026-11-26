// Scénář „AI kreslí dům“, část pohodlí úprav a rekonstrukce (plán stěn Z9, Z10): pipeta, výběr stejných,
// rozdělit s mezerou, vybourat úsek, probourání, kontrola modelu.
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

  it('rekonstrukce a kontrola: vybourat úsek, probourat otvor, kontrola bez varování (plán stěn Z10)', () => {
    const c = start();
    const [left] = room(c);
    c.ai.call('wall.setProperties', { wallIds: [left], status: 'existing' });
    const w = c.ai.call<{ path: { start: { x: number; y: number }; end: { x: number; y: number } } }>(
      'wall.get',
      { wallId: left },
    );
    const at = (t: number) => ({
      x: w.path.start.x + (w.path.end.x - w.path.start.x) * t,
      y: w.path.start.y + (w.path.end.y - w.path.start.y) * t,
    });
    const [mid] = c.ai.call<string[]>('wall.demolishPart', { wallId: left, from: at(0.2), to: at(0.4) });
    expect(row(c.ai.call<WallRow[]>('wall.list'), mid!).status).toBe('demolished');
    c.ai.call('opening.create', {
      wallId: left,
      offset: 100,
      width: 300,
      height: 2000,
      sill: 0,
      status: 'new',
    });
    expect(c.ai.call<unknown[]>('model.check', {})).toEqual([]);
  });
});
