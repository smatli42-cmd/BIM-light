import { describe, expect, it } from 'vitest';
import { SCHEMA_VERSION } from '../model/types.ts';
import { parseProject, serializeProject } from '../persistence/project-file.ts';
import { fixture } from '../testing/fixture.ts';

describe('základ 9 / koncepce-rozhrani 4: migrace projektu 9 → 10 (pracovní okno a uložené pohledy)', () => {
  it('první pohled podlaží je pracovní okno, další pohled téhož podlaží je uložený', () => {
    const f = fixture();
    f.run('view.create', { storeyId: f.storeyId, styleId: f.style('Projekt') });
    const old = JSON.parse(serializeProject(f.model)) as { views: Record<string, Record<string, unknown>> };
    for (const v of Object.values(old.views)) delete v.saved;
    const r = parseProject(JSON.stringify({ ...old, schemaVersion: 9 }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.model.schemaVersion).toBe(SCHEMA_VERSION);
    expect(Object.values(r.model.views).map((v) => v.saved)).toEqual([false, true]);
  });
});
