import { describe, expect, it } from 'vitest';
import { parseProject, serializeProject } from '../persistence/project-file.ts';
import { fixture } from '../testing/fixture.ts';

describe('plan-steny / Z6, základ 9: migrace projektu 10 → 11 (konce stěn a značka osy)', () => {
  it('starý projekt bez nových vlastností grafiky dostane konce stěn zapnuté a značku osy vypnutou', () => {
    const f = fixture();
    const raw = JSON.parse(serializeProject(f.model)) as Record<string, unknown>;
    const display = raw['display'] as Record<string, unknown>;
    const { endLines: _e, refLine: _r, ...base } = display['baseGraphics'] as Record<string, unknown>;
    const old = { ...raw, schemaVersion: 10, display: { ...display, schemaVersion: 3, baseGraphics: base } };
    const r = parseProject(JSON.stringify(old));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.model.display.baseGraphics.endLines).toBe(true);
    expect(r.model.display.baseGraphics.refLine).toBe(false);
    expect(r.model.display.schemaVersion).toBe(4);
  });
});
