import { describe, expect, it } from 'vitest';
import { SCHEMA_VERSION } from '../model/types.ts';
import { parseProject, serializeProject } from '../persistence/project-file.ts';
import { fixture } from '../testing/fixture.ts';

describe('základ 9 / plan-steny Z8: migrace projektu 13 → 14', () => {
  it('typy dostanou značky S1, S2… a projekt výchozí výkazy', () => {
    const f = fixture();
    const old = JSON.parse(serializeProject(f.model)) as Record<string, unknown> & {
      wallTypes: Record<string, Record<string, unknown>>;
    };
    for (const t of Object.values(old.wallTypes)) delete t.mark;
    delete old.schedules;
    const r = parseProject(JSON.stringify({ ...old, schemaVersion: 13 }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.model.schemaVersion).toBe(SCHEMA_VERSION);
    expect(Object.values(r.model.wallTypes).map((t) => t.mark)).toEqual(
      Object.values(r.model.wallTypes).map((_, i) => `S${i + 1}`),
    );
    expect(Object.values(r.model.schedules).map((s) => s.name)).toEqual([
      'Výkaz stěn',
      'Výkaz materiálů stěn',
      'Legenda skladeb',
      'Výkaz desek',
      'Výpis místností', // přidá migrace 21 → 22 (desky D4)
    ]);
  });
});
