import { describe, expect, it } from 'vitest';
import { createCoreRegistry } from '../commands/all.ts';
import { aiClient } from '../testing/ai-client.ts';

describe('základy 6, 15: všechno, čím vzniká projekt, jde ovládat přes AI', () => {
  const tools = createCoreRegistry().toolDescriptions();

  it('nástroje AI = všechny příkazy + dotazy z registru, jména se neopakují', () => {
    const r = createCoreRegistry();
    expect(tools.length).toBe(r.list().length + r.listQueries().length);
    expect(new Set(tools.map((t) => t.name)).size).toBe(tools.length);
  });

  it('AI vidí model: jsou dotazy jen pro čtení na projekt, stěny a kóty', () => {
    const ro = tools.filter((t) => t.readOnly).map((t) => t.name);
    expect(ro).toEqual(expect.arrayContaining(['project.info', 'wall.list', 'wall.get', 'dimension.list']));
  });

  it.each(tools.map((t) => [t.name, t] as const))('%s: popis pro AI a úplné schéma parametrů', (_, t) => {
    expect(t.description.length).toBeGreaterThan(40);
    const shapes = t.inputSchema.oneOf ?? [t.inputSchema];
    for (const s of shapes) {
      expect(s.type).toBe('object');
      expect(s.additionalProperties).toBe(false);
    }
    expect(JSON.parse(JSON.stringify(t))).toEqual(t);
  });

  it('chyby jsou pro AI čitelné: neznámý nástroj, špatné parametry, neexistující prvek', () => {
    const ai = aiClient();
    expect(ai.raw('wall.fly', {}).error?.code).toBe('unknown-tool');
    const bad = ai.raw('wall.chain', { storeyId: 'x', typeId: 'y', points: [{ x: 0 }] });
    expect(bad.error?.code).toBe('invalid-params');
    expect(bad.error?.message).toMatch(/points\[0\]\.y: chybí/);
    expect(ai.raw('wall.get', { wallId: 'nic' }).error?.code).toBe('not-found');
  });

  it('dotaz model nezmění a nejde do Undo', () => {
    const ai = aiClient();
    const before = JSON.stringify(ai.call('project.info'));
    ai.call('wall.list');
    expect(JSON.stringify(ai.call('project.info'))).toBe(before);
  });
});
