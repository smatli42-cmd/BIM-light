import { describe, expect, it } from 'vitest';
import { parseProject, serializeProject } from '../persistence/project-file.ts';
import { fixture, room } from '../testing/fixture.ts';

describe('základ 9 / plan-steny Z2: migrace projektu 3 → 4 (nespojovat u napojení)', () => {
  it('projekt verze 3 se načte beze změny napojení a dostane verzi 4', () => {
    const f = fixture();
    room(f);
    const old = JSON.parse(serializeProject(f.model)) as Record<string, unknown>;
    const r = parseProject(JSON.stringify({ ...old, schemaVersion: 3 }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.model.schemaVersion).toBe(4);
    expect(r.model.relations).toEqual(f.model.relations);
    expect(Object.values(r.model.relations).some((c) => c.noJoin)).toBe(false);
  });
});
