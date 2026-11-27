import { describe, expect, it } from 'vitest';
import { parseProject, serializeProject } from '../persistence/project-file.ts';
import { fixture } from '../testing/fixture.ts';
import { elementFacts } from './conditions.ts';
import { resolveGraphics } from './graphics.ts';
import { DISPLAY_SCHEMA_VERSION } from './presets/create.ts';

const combo = (f: ReturnType<typeof fixture>, name: string) =>
  Object.values(f.model.display.overrideCombinations).find((c) => c.name === name)?.id ?? '';

describe('základ 11 / 3D náhled: barva povrchu ve 3D přes funkci grafiky', () => {
  it('základ 11: výchozí surfaceColor null (barva materiálu), bourané žlutě i ve 3D – s „proč“', () => {
    const f = fixture();
    const id = f.line({ x: 0, y: 0 }, { x: 5000, y: 0 }, { status: 'demolished' });
    const view = () => f.model.views[f.viewId]!;
    const g0 = resolveGraphics(f.model.display, view(), elementFacts(f.model, f.wall(id)));
    expect(g0.effect.surfaceColor).toBeNull();
    expect(g0.why.surfaceColor.level).toBe(1);
    f.run('view.setOverrideCombination', {
      viewId: f.viewId,
      combinationId: combo(f, 'Fáze – bourací práce'),
    });
    const g = resolveGraphics(f.model.display, view(), elementFacts(f.model, f.wall(id)));
    expect(g.effect.surfaceColor).toBe('#fff3b0');
    expect(g.why.surfaceColor.source).toBe('Bourání žlutě čárkovaně');
  });

  it('základ 11: výplň řezu stylu (šedá Studie) barvu povrchu nemění', () => {
    const f = fixture();
    const id = f.line({ x: 0, y: 0 }, { x: 5000, y: 0 });
    const g = resolveGraphics(f.model.display, f.model.views[f.viewId]!, elementFacts(f.model, f.wall(id)));
    expect(g.effect.surfaceColor).toBeNull();
  });

  it('základ 9: migrace 17 → 18 – výchozí grafika dostane surfaceColor null, pravidlo bourání žlutou', () => {
    const f = fixture();
    const raw = JSON.parse(serializeProject(f.model)) as Record<string, unknown>;
    const display = raw['display'] as Record<string, Record<string, unknown>>;
    const { surfaceColor: _s, ...base } = display['baseGraphics']!;
    const rules = Object.fromEntries(
      Object.entries(display['rules']!).map(([k, r]) => {
        const { surfaceColor: _x, ...effect } = (r as { effect: Record<string, unknown> }).effect;
        return [k, { ...(r as object), effect }];
      }),
    );
    const old = {
      ...raw,
      schemaVersion: 17,
      display: { ...display, schemaVersion: 5, baseGraphics: base, rules },
    };
    const r = parseProject(JSON.stringify(old));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.model.display.baseGraphics.surfaceColor).toBeNull();
    const demolish = Object.values(r.model.display.rules).find((x) => x.name === 'Bourání žlutě čárkovaně');
    expect(demolish?.effect.surfaceColor).toBe('#fff3b0');
    const red = Object.values(r.model.display.rules).find((x) => x.name === 'Nové červeně');
    expect(red?.effect.surfaceColor).toBeUndefined();
    expect(r.model.display.schemaVersion).toBe(DISPLAY_SCHEMA_VERSION);
  });
});
