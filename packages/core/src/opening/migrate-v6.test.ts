import { describe, expect, it } from 'vitest';
import { SCHEMA_VERSION } from '../model/types.ts';
import { parseProject, serializeProject } from '../persistence/project-file.ts';
import { fixture, room } from '../testing/fixture.ts';

describe('základ 9 / plan-steny Z4: migrace projektu 6 → 7 (otvory, rovina řezu pohledu)', () => {
  it('projekt verze 6 dostane prázdné otvory a rovinu řezu 1000 mm u každého pohledu', () => {
    const f = fixture();
    room(f);
    const { openings: _o, ...old } = JSON.parse(serializeProject(f.model)) as Record<string, unknown>;
    const views = Object.fromEntries(
      Object.entries(old.views as Record<string, Record<string, unknown>>).map(([id, v]) => {
        const { cutPlane: _c, ...rest } = v;
        return [id, rest];
      }),
    );
    const r = parseProject(JSON.stringify({ ...old, views, schemaVersion: 6 }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.model.schemaVersion).toBe(SCHEMA_VERSION);
    expect(r.model.openings).toEqual({});
    expect(Object.values(r.model.views).map((v) => v.cutPlane)).toEqual([1000]);
  });
});
