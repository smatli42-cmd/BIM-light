import { describe, expect, it } from 'vitest';
import { SCHEMA_VERSION } from '../model/types.ts';
import { parseProject, serializeProject } from '../persistence/project-file.ts';
import { fixture } from '../testing/fixture.ts';

describe('základ 9 / rozhraní UI2: migrace projektu 8 → 9 (referenční čára vně)', () => {
  it('projekt verze 8 se načte beze změny stěn a dostane aktuální verzi', () => {
    const f = fixture();
    f.line({ x: 0, y: 0 }, { x: 5000, y: 0 });
    const old = JSON.parse(serializeProject(f.model)) as Record<string, unknown>;
    const r = parseProject(JSON.stringify({ ...old, schemaVersion: 8 }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.model.schemaVersion).toBe(SCHEMA_VERSION);
    expect(r.model.elements).toEqual(f.model.elements);
  });
});
