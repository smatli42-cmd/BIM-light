import { describe, expect, it } from 'vitest';
import { vec } from '../geometry/index.ts';
import { SCHEMA_VERSION } from '../model/types.ts';
import { parseProject, serializeProject } from '../persistence/project-file.ts';
import { fixture } from '../testing/fixture.ts';

describe('základ 9 / plan-steny Z5: migrace projektu 7 → 8 (kóty oblouku)', () => {
  it('projekt verze 7 s délkovou kótou se načte beze změny a dostane aktuální verzi', () => {
    const f = fixture();
    const w = f.line(vec(0, 0), vec(5000, 0));
    f.run('dimension.create', { kind: 'length', ref: { wallId: w, face: 'ref' }, viewId: f.viewId });
    const old = JSON.parse(serializeProject(f.model)) as Record<string, unknown>;
    const r = parseProject(JSON.stringify({ ...old, schemaVersion: 7 }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.model.schemaVersion).toBe(SCHEMA_VERSION);
    expect(r.model.dimensions).toEqual(f.model.dimensions);
  });
});
