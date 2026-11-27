// AI scénář: stěna stojí na nosné desce (hlášení uživatele 2026-11-27) – příčka na skladbě podlahy sahá
// spodkem k hornímu líci nosné desky; vidět je to v `wall.list` (bottom) i v řezu (`section.elements`).
import { describe, expect, it } from 'vitest';
import { must, start } from './scenario-helpers.ts';

describe('AI scénář: spodek stěny na nosné desce', () => {
  it('nosná deska −150 pod čistou podlahou: příčka i její řez začínají na −150, podlaha se k ní přisadí', () => {
    const c = start();
    const types = c.ai.call<{ id: string; name: string }[]>('slabType.list');
    const typeOf = (n: string) => must(types.find((t) => t.name === n)).id;
    c.ai.call('slab.create', {
      storeyId: c.storeyId,
      typeId: typeOf('ŽB strop 250'),
      rect: { a: { x: -1000, y: -1000 }, b: { x: 5000, y: 3000 } },
      topOffset: -150,
    });
    const wallTypes = c.ai.call<{ id: string; name: string }[]>('wallType.list');
    const [wall] = c.ai.call<string[]>('wall.create', {
      storeyId: c.storeyId,
      typeId: must(wallTypes.find((t) => t.name === 'Příčka 100')).id,
      path: { kind: 'line', start: { x: 0, y: 1000 }, end: { x: 4000, y: 1000 } },
    });
    const row = must(c.ai.call<{ id: string; bottom: number }[]>('wall.list').find((w) => w.id === wall));
    expect(row.bottom).toBe(-150);
    const [sec] = c.ai.call<string[]>('section.create', {
      start: { x: 2000, y: -500 },
      end: { x: 2000, y: 2500 },
    });
    type Row = { elementId: string; bottom: number };
    const cut = c.ai.call<{ cut: Row[] }>('section.elements', { sectionId: sec }).cut;
    expect(must(cut.find((r) => r.elementId === wall)).bottom).toBe(-150);
  });
});
